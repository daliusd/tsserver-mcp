import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { resolve } from 'path';
import { TSServerRequest, TSServerResponse, TSServerEvent } from './protocol.js';
import { getLogger } from '../logger/index.js';

export class TSServerClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private sequence = 1;
  private pendingRequests = new Map<number, {
    resolve: (_value: any) => void;
    reject: (_error: any) => void;
  }>();
  private buffer = '';
  private openFiles = new Set<string>();
  private logger = getLogger();

  constructor(
    private tsserverPath = 'npx',
    private skipAvailabilityCheck = false,
  ) {
    super();
  }

  async start(): Promise<void> {
    if (this.process) {
      throw new Error('TSServer already started');
    }

    this.logger.debug('Starting TSServer process', { 
      tsserverPath: this.tsserverPath,
      skipAvailabilityCheck: this.skipAvailabilityCheck,
      args: [
        '--logVerbosity', 'off',
        '--suppressDiagnosticEvents',
        '--useSingleInferredProject',
      ],
      env: { TSS_LOG: '-logToFile false' },
    });

    return new Promise((resolve, reject) => {
      this.process = spawn(this.tsserverPath, [
        'tsserver',
        '--logVerbosity', 'off',
        '--suppressDiagnosticEvents',
        '--useSingleInferredProject',
      ], {
        stdio: 'pipe',
        env: { ...process.env, TSS_LOG: '-logToFile false' },
      });

      if (!this.process.stdout || !this.process.stdin || !this.process.stderr) {
        const error = new Error('Failed to create tsserver process pipes');
        this.logger.error('Failed to create TSServer process pipes', { error: error.message });
        reject(error);
        return;
      }

      this.logger.debug('TSServer process created successfully', {
        pid: this.process.pid,
        hasStdout: !!this.process.stdout,
        hasStdin: !!this.process.stdin,
        hasStderr: !!this.process.stderr,
      });

      this.process.stdout.setEncoding('utf8');
      this.process.stdout.on('data', (data: string) => {
        this.logger.debug('TSServer stdout data event', {
          dataLength: data.length,
          bufferLengthBefore: this.buffer.length,
        });
        this.handleData(data);
      });

      this.process.stderr.on('data', (data: Buffer) => {
        const errorMessage = data.toString();
        console.error('TSServer stderr:', errorMessage);
        this.logger.warn('TSServer stderr output', { 
          message: errorMessage,
          length: errorMessage.length,
          raw: data.toString('hex').slice(0, 100),
        });
      });

      this.process.on('error', (error) => {
        console.error('TSServer process error:', error);
        this.logger.error('TSServer process error', { 
          error: error.message,
          stack: error.stack,
          code: (error as any).code,
          errno: (error as any).errno,
          syscall: (error as any).syscall,
          path: (error as any).path,
        });
        this.emit('error', error);
      });

      this.process.on('exit', (code, signal) => {
        console.log(`TSServer exited with code ${code}, signal ${signal}`);
        this.logger.info('TSServer process exited', { 
          code, 
          signal,
          openFiles: this.openFiles.size,
          pendingRequests: this.pendingRequests.size,
          wasKilled: this.process?.killed,
        });
        this.process = null;
        this.emit('exit', code, signal);
      });

      // Wait for tsserver to initialize properly - use shorter timeout in tests
      if (this.skipAvailabilityCheck) {
        // In tests, just wait a bit and resolve
        setTimeout(() => {
          this.logger.debug('TSServer initialization complete (test mode)');
          resolve();
        }, 100);
      } else {
        setTimeout(async () => {
          try {
            // Send configure request to ensure TSServer is ready
            await this.request('configure', {
              preferences: {
                includeCompletionsForModuleExports: true,
                includeCompletionsWithInsertText: true,
                maximumHoverLength: 1000000,
              },
            });
            this.logger.debug('TSServer initialization and configuration complete');
            resolve();
          } catch (error) {
            this.logger.error('TSServer configuration failed', { error });
            reject(error);
          }
        }, 2000);
      }
    });
  }

  private handleData(data: string): void {
    this.logger.debug('TSServer raw output received', { 
      data: data.replace(/\r?\n/g, '\\n'),
      length: data.length,
      bufferLength: this.buffer.length,
    });

    this.buffer += data;

    while (true) {
      const headerMatch = this.buffer.match(/^Content-Length: (\d+)\r?\n\r?\n/);
      if (!headerMatch) {
        // No Content-Length header found, wait for more data
        break;
      }

      const contentLength = parseInt(headerMatch[1], 10);
      const headerLength = headerMatch[0].length;
      
      this.logger.debug('TSServer Content-Length format detected', {
        contentLength,
        headerLength,
        bufferLength: this.buffer.length,
        hasEnoughData: this.buffer.length >= headerLength + contentLength,
      });
      
      if (this.buffer.length < headerLength + contentLength) {
        // Not enough data yet, wait for more
        this.logger.debug('TSServer waiting for more data', {
          needed: headerLength + contentLength,
          current: this.buffer.length,
        });
        break;
      }

      // Extract the complete message
      const content = this.buffer.slice(headerLength, headerLength + contentLength);
      this.buffer = this.buffer.slice(headerLength + contentLength);

      this.logger.debug('TSServer extracted Content-Length message', {
        content,
        remainingBufferLength: this.buffer.length,
      });

      try {
        const message = JSON.parse(content);
        this.handleMessage(message);
      } catch (error) {
        this.logger.warn('Failed to parse TSServer Content-Length message', { content, error });
      }
    }
  }

  private handleMessage(message: TSServerResponse | TSServerEvent): void {
    this.logger.debug('TSServer message received', {
      type: message.type,
      messagePreview: JSON.stringify(message).slice(0, 200),
      fullMessage: message,
    });

    if (message.type === 'response') {
      this.logger.debug('TSServer response processing', {
        request_seq: message.request_seq,
        success: message.success,
        command: (message as any).command,
        hasPendingRequest: this.pendingRequests.has(message.request_seq),
      });

      const pending = this.pendingRequests.get(message.request_seq);
      if (pending) {
        this.pendingRequests.delete(message.request_seq);
        if (message.success) {
          this.logger.debug('TSServer request successful', {
            request_seq: message.request_seq,
            bodyPreview: message.body ? JSON.stringify(message.body).slice(0, 100) : 'no body',
          });
          pending.resolve(message.body);
        } else {
          const error = new Error(message.message || 'Request failed');
          // Check if this is a debug failure and add context
          if (message.message && message.message.includes('Debug Failure')) {
            error.message = `TSServer Debug Failure: ${message.message}. This may be due to file state issues or concurrent operations.`;
          }
          this.logger.error('TSServer request failed', {
            request_seq: message.request_seq,
            error: error.message,
            originalMessage: message.message,
          });
          pending.reject(error);
        }
      } else {
        this.logger.warn('TSServer response received for unknown request', {
          request_seq: message.request_seq,
          pendingRequests: Array.from(this.pendingRequests.keys()),
        });
      }
    } else if (message.type === 'event') {
      this.logger.debug('TSServer event received', {
        event: message.event,
        eventData: message.body ? JSON.stringify(message.body).slice(0, 200) : 'no body',
        fullEventBody: message.body,
      });
      this.emit('event', message);
    } else {
      this.logger.warn('TSServer unknown message type received', {
        messageType: (message as any).type,
        fullMessage: message,
      });
    }
  }

  async request<T = any>(command: string, args?: any): Promise<T> {
    return this.requestWithRetry(command, args, 3);
  }

  // Send a notification command that doesn't expect a response
  async notify(command: string, args?: any): Promise<void> {
    if (!this.process || !this.process.stdin) {
      throw new Error('TSServer not started');
    }

    const seq = this.sequence++;
    const request: TSServerRequest = {
      seq,
      type: 'request',
      command,
      arguments: args,
    };

    this.logger.debug('Sending TSServer notification', { 
      command, 
      seq, 
      args: args ? Object.keys(args) : [],
    });

    const requestStr = JSON.stringify(request);
    this.logger.debug('TSServer sending notification', {
      command,
      seq,
      requestStr,
      requestLength: requestStr.length,
      fullRequest: request,
    });

    this.process.stdin.write(`${requestStr}\n`);
  }

  private async requestWithRetry<T = any>(command: string, args?: any, maxRetries = 3): Promise<T> {
    if (!this.process || !this.process.stdin) {
      throw new Error('TSServer not started');
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const seq = this.sequence++;
      const request: TSServerRequest = {
        seq,
        type: 'request',
        command,
        arguments: args,
      };

      this.logger.debug('Sending TSServer request', { 
        command, 
        seq, 
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        args: args ? Object.keys(args) : [],
      });

      try {
        return await new Promise<T>((resolve, reject) => {
          this.pendingRequests.set(seq, { resolve, reject });

          const requestStr = JSON.stringify(request);
          this.logger.debug('TSServer sending request', {
            command,
            seq,
            requestStr,
            requestLength: requestStr.length,
            fullRequest: request,
          });

          this.process!.stdin!.write(`${requestStr}\n`);

          // Set timeout for request - longer timeout for open command
          const timeout = command === 'open' ? 30000 : 15000;
          setTimeout(() => {
            if (this.pendingRequests.has(seq)) {
              this.pendingRequests.delete(seq);
              const timeoutError = new Error(`Request ${command} timed out after ${timeout}ms`);
              this.logger.error('TSServer request timeout', { command, seq, timeout });
              reject(timeoutError);
            }
          }, timeout);
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check if this is a recoverable debug failure
        const isDebugFailure = errorMessage.includes('Debug Failure');
        const isLastAttempt = attempt === maxRetries;

        this.logger.warn('TSServer request failed', {
          command,
          seq,
          attempt: attempt + 1,
          error: errorMessage,
          isDebugFailure,
          willRetry: isDebugFailure && !isLastAttempt,
        });

        if (isDebugFailure && !isLastAttempt) {
          // Wait with exponential backoff before retrying
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.error(`TSServer debug failure on attempt ${attempt + 1}, retrying in ${delay}ms...`);
          this.logger.info('Retrying TSServer request after debug failure', { 
            command, 
            seq, 
            delay, 
          });
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    const finalError = new Error(`Request ${command} failed after ${maxRetries + 1} attempts`);
    this.logger.error('TSServer request failed after all retries', { 
      command, 
      maxRetries: maxRetries + 1, 
    });
    throw finalError;
  }

  async openFile(file: string): Promise<void> {
    const normalizedPath = resolve(file);
    if (this.openFiles.has(normalizedPath)) {
      this.logger.debug('File already open, skipping', { file: normalizedPath });
      return; // File already open
    }

    this.logger.debug('Opening file in TSServer', { file: normalizedPath });
    await this.notify('open', { file: normalizedPath });
    this.openFiles.add(normalizedPath);
    this.logger.debug('File opened successfully', { 
      file: normalizedPath,
      totalOpenFiles: this.openFiles.size,
    });
  }

  async closeFile(file: string): Promise<void> {
    const normalizedPath = resolve(file);
    if (!this.openFiles.has(normalizedPath)) {
      this.logger.debug('File not open, skipping close', { file: normalizedPath });
      return; // File not open
    }

    this.logger.debug('Closing file in TSServer', { file: normalizedPath });
    await this.notify('close', { file: normalizedPath });
    this.openFiles.delete(normalizedPath);
    this.logger.debug('File closed successfully', { 
      file: normalizedPath,
      totalOpenFiles: this.openFiles.size,
    });
  }

  async stop(): Promise<void> {
    this.logger.debug('Stopping TSServer client', { 
      openFiles: this.openFiles.size,
      pendingRequests: this.pendingRequests.size,
    });
    
    // Cancel all pending requests first
    for (const [, { reject }] of this.pendingRequests) {
      reject(new Error('TSServer is shutting down'));
    }
    this.pendingRequests.clear();
    
    if (this.process) {
      // Try graceful shutdown first
      if (this.process.stdin) {
        try {
          this.process.stdin.write('{"seq":0,"type":"request","command":"exit"}\n');
          this.process.stdin.end();
        } catch (error) {
          this.logger.debug('Failed to send exit command', { error });
        }
      }
      
      // Wait briefly for graceful exit
      const exitPromise = new Promise<void>((resolve) => {
        if (this.process) {
          this.process.once('exit', () => resolve());
        } else {
          resolve();
        }
      });
      
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 3000);
      });
      
      await Promise.race([exitPromise, timeoutPromise]);
      
      // Force kill if still running
      if (this.process && !this.process.killed) {
        this.logger.debug('Force killing TSServer process');
        this.process.kill('SIGKILL');
      }
      
      this.process = null;
      this.logger.debug('TSServer process stopped');
    }
    
    this.openFiles.clear();
    this.logger.debug('TSServer client stopped');
  }
}