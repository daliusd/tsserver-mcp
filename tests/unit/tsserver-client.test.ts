import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TSServerClient } from '../../src/tsserver/client';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

vi.mock('child_process');
vi.mock('../../src/logger/index.js', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getLogDirectory: vi.fn().mockReturnValue('/tmp/test-logs'),
  }),
}));

const mockSpawn = spawn as any;

describe('TSServerClient', () => {
  let client: TSServerClient;
  let mockProcess: any;

  beforeEach(() => {
    mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stdout.setEncoding = vi.fn();
    mockProcess.stderr = new EventEmitter();
    mockProcess.stdin = { write: vi.fn() };
    mockProcess.kill = vi.fn();
    
    mockSpawn.mockReturnValue(mockProcess as any);
    // Skip availability check in tests
    client = new TSServerClient('npx', true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('start', () => {
    it('should spawn tsserver process', async () => {
      const startPromise = client.start();
      
      // Simulate process startup delay
      setTimeout(() => {
        // Process started successfully
      }, 500);

      await startPromise;

      expect(mockSpawn).toHaveBeenCalledWith('npx', [
        'tsserver',
        '--logVerbosity', 'off',
        '--suppressDiagnosticEvents',
        '--useSingleInferredProject',
      ], {
        stdio: 'pipe',
        env: { ...process.env, TSS_LOG: '-logToFile false' }
      });
    });

    it('should throw error if already started', async () => {
      await client.start();
      await expect(client.start()).rejects.toThrow('TSServer already started');
    });
  });

  describe('request', () => {
    beforeEach(async () => {
      await client.start();
    });

    it('should send request and resolve with response', async () => {
      const command = 'definition';
      const args = { file: 'test.ts', line: 1, offset: 1 };
      
      const requestPromise = client.request(command, args);

      // Simulate tsserver response
      setTimeout(() => {
        const response = JSON.stringify({
          seq: 0,
          type: 'response',
          command,
          request_seq: 1, // First request after client start
          success: true,
          body: [{ file: 'test.ts', start: { line: 1, offset: 1 } }]
        });
        const contentLength = response.length;
        mockProcess.stdout.emit('data', `Content-Length: ${contentLength}\n\n${response}\n`);
      }, 100);

      const result = await requestPromise;
      expect(result).toEqual([{ file: 'test.ts', start: { line: 1, offset: 1 } }]);
    });

    it('should reject on error response', async () => {
      const command = 'definition';
      const args = { file: 'test.ts', line: 1, offset: 1 };
      
      const requestPromise = client.request(command, args);

      // Simulate error response
      setTimeout(() => {
        const response = JSON.stringify({
          seq: 0,
          type: 'response',
          command,
          request_seq: 1, // First request after client start
          success: false,
          message: 'File not found'
        });
        const contentLength = response.length;
        mockProcess.stdout.emit('data', `Content-Length: ${contentLength}\n\n${response}\n`);
      }, 100);

      await expect(requestPromise).rejects.toThrow('File not found');
    });

    it('should timeout after 15 seconds', async () => {
      const command = 'definition';
      const args = { file: 'test.ts', line: 1, offset: 1 };
      
      const requestPromise = client.request(command, args);

      // Don't send any response to trigger timeout
      await expect(requestPromise).rejects.toThrow('Request definition timed out after 15000ms');
    }, 20000);

    it('should throw error if not started', async () => {
      const newClient = new TSServerClient('npx', true);
      await expect(newClient.request('definition')).rejects.toThrow('TSServer not started');
    });
  });

  describe('openFile and closeFile', () => {
    beforeEach(async () => {
      await client.start();
    });

    it('should send open file request', async () => {
      const openPromise = client.openFile('/test/file.ts');

      setTimeout(() => {
        const response = JSON.stringify({
          seq: 0,
          type: 'response',
          command: 'open',
          request_seq: 1, // First request after client start
          success: true
        });
        const contentLength = response.length;
        mockProcess.stdout.emit('data', `Content-Length: ${contentLength}\n\n${response}\n`);
      }, 100);

      await openPromise;
      expect(mockProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"command":"open"')
      );
    });

    it('should send close file request', async () => {
      // First open the file
      const openPromise = client.openFile('/test/file.ts');
      
      setTimeout(() => {
        const openResponse = JSON.stringify({
          seq: 0,
          type: 'response',
          command: 'open',
          request_seq: 1, // First request after client start
          success: true
        });
        const contentLength = openResponse.length;
        mockProcess.stdout.emit('data', `Content-Length: ${contentLength}\n\n${openResponse}\n`);
      }, 50);
      
      await openPromise;
      
      // Now close the file
      const closePromise = client.closeFile('/test/file.ts');

      setTimeout(() => {
        const closeResponse = JSON.stringify({
          seq: 0,
          type: 'response',
          command: 'close',
          request_seq: 2, // Second request after open
          success: true
        });
        const contentLength = closeResponse.length;
        mockProcess.stdout.emit('data', `Content-Length: ${contentLength}\n\n${closeResponse}\n`);
      }, 100);

      await closePromise;
      expect(mockProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"command":"close"')
      );
    });
  });

  describe('stop', () => {
    it('should kill the process', async () => {
      await client.start();
      await client.stop();
      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });

  describe('handleData', () => {
    beforeEach(async () => {
      await client.start();
    });

    it('should handle multiple messages in one data chunk', async () => {
      const command1 = 'definition';
      const command2 = 'hover';
      
      const promise1 = client.request(command1);
      const promise2 = client.request(command2);

      // Send both responses in one data chunk
      setTimeout(() => {
        const response1 = JSON.stringify({
          seq: 0,
          type: 'response',
          command: command1,
          request_seq: 1, // First request after client start
          success: true,
          body: 'result1'
        });
        const response2 = JSON.stringify({
          seq: 0,
          type: 'response',
          command: command2,
          request_seq: 2, // Second request
          success: true,
          body: 'result2'
        });

        const contentLength1 = response1.length;
        const contentLength2 = response2.length;
        // Remove extra newlines between messages - just concatenate properly
        const data = `Content-Length: ${contentLength1}\n\n${response1}Content-Length: ${contentLength2}\n\n${response2}`;
        
        mockProcess.stdout.emit('data', data);
      }, 100);

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
    });

    it('should handle partial messages across data chunks', async () => {
      const command = 'definition';
      const requestPromise = client.request(command);

      const response = JSON.stringify({
        seq: 0,
        type: 'response',
        command,
        request_seq: 1, // First request after client start
        success: true,
        body: 'result'
      });

      const contentLength = response.length;
      const fullMessage = `Content-Length: ${contentLength}\n\n${response}\n`;

      // Send response in chunks
      const midpoint = Math.floor(fullMessage.length / 2);
      mockProcess.stdout.emit('data', fullMessage.substring(0, midpoint));
      mockProcess.stdout.emit('data', fullMessage.substring(midpoint));

      const result = await requestPromise;
      expect(result).toBe('result');
    });

    it('should emit events for event messages', async () => {
      const eventData = {
        seq: 0,
        type: 'event',
        event: 'syntaxDiag',
        body: { diagnostics: [] }
      };

      const eventPromise = new Promise((resolve) => {
        client.on('event', (event) => {
          expect(event).toEqual(eventData);
          resolve(event);
        });
      });

      const eventJson = JSON.stringify(eventData);
      const contentLength = eventJson.length;
      mockProcess.stdout.emit('data', `Content-Length: ${contentLength}\n\n${eventJson}\n`);
      await eventPromise;
    });
  });
});