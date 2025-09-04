#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TSServerClient } from './tsserver/client.js';
import { getDefinition } from './tools/definition.js';
import { getHover } from './tools/hover.js';
import { getReferences } from './tools/references.js';
import { getDiagnostics } from './tools/diagnostics.js';
import { getRename } from './tools/rename.js';
import { organizeImports } from './tools/organizeImports.js';
import { getLogger } from './logger/index.js';
import { getConfigManager } from './config/manager.js';

class TSServerMCP {
  private server: Server;
  private tsClient: TSServerClient;
  private transport: StdioServerTransport | null = null;
  private logger = getLogger();
  private configManager = getConfigManager();
  private connectionLost = false;

  constructor() {
    this.server = new Server(
      {
        name: 'tsserver-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.tsClient = new TSServerClient();
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'ts_definition',
            description: 'Get the definition of a symbol at a specific position in a TypeScript file',
            inputSchema: {
              type: 'object',
              properties: {
                file: {
                  type: 'string',
                  description: 'Path to the TypeScript file',
                },
                line: {
                  type: 'number',
                  description: 'Line number (1-indexed)',
                },
                offset: {
                  type: 'number',
                  description: 'Character offset in the line (1-indexed)',
                },
              },
              required: ['file', 'line', 'offset'],
            },
          },
          {
            name: 'ts_hover',
            description: 'Get type information and documentation for a symbol at a specific position',
            inputSchema: {
              type: 'object',
              properties: {
                file: {
                  type: 'string',
                  description: 'Path to the TypeScript file',
                },
                line: {
                  type: 'number',
                  description: 'Line number (1-indexed)',
                },
                offset: {
                  type: 'number',
                  description: 'Character offset in the line (1-indexed)',
                },
              },
              required: ['file', 'line', 'offset'],
            },
          },
          {
            name: 'ts_references',
            description: 'Find all references to a symbol at a specific position',
            inputSchema: {
              type: 'object',
              properties: {
                file: {
                  type: 'string',
                  description: 'Path to the TypeScript file',
                },
                line: {
                  type: 'number',
                  description: 'Line number (1-indexed)',
                },
                offset: {
                  type: 'number',
                  description: 'Character offset in the line (1-indexed)',
                },
              },
              required: ['file', 'line', 'offset'],
            },
          },
          {
            name: 'ts_rename',
            description: 'Get rename information and preview changes for renaming a symbol',
            inputSchema: {
              type: 'object',
              properties: {
                file: {
                  type: 'string',
                  description: 'Path to the TypeScript file',
                },
                line: {
                  type: 'number',
                  description: 'Line number (1-indexed)',
                },
                offset: {
                  type: 'number',
                  description: 'Character offset in the line (1-indexed)',
                },
                newName: {
                  type: 'string',
                  description: 'New name for the symbol',
                },
              },
              required: ['file', 'line', 'offset', 'newName'],
            },
          },
          {
            name: 'ts_diagnostics',
            description: 'Get syntactic and semantic diagnostics for a TypeScript file',
            inputSchema: {
              type: 'object',
              properties: {
                file: {
                  type: 'string',
                  description: 'Path to the TypeScript file',
                },
              },
              required: ['file'],
            },
          },
          {
            name: 'ts_organize_imports',
            description: 'Organize imports in a TypeScript file',
            inputSchema: {
              type: 'object',
              properties: {
                file: {
                  type: 'string',
                  description: 'Path to the TypeScript file',
                },
              },
              required: ['file'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error('Arguments are required');
      }

      try {
        switch (name) {
          case 'ts_definition': {
            this.logger.debug('Getting definition', { file: args.file, line: args.line, offset: args.offset });
            const result = await getDefinition(this.tsClient, args as any);
            this.logger.debug('Definition result', { resultCount: result?.definitions?.length || 0 });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'ts_hover': {
            this.logger.debug('Getting hover info', { file: args.file, line: args.line, offset: args.offset });
            const result = await getHover(this.tsClient, args as any);
            this.logger.debug('Hover result', { hasResult: !!result });
            return {
              content: [
                {
                  type: 'text',
                  text: result ? JSON.stringify(result, null, 2) : 'No hover information available',
                },
              ],
            };
          }

          case 'ts_references': {
            this.logger.debug('Getting references', { file: args.file, line: args.line, offset: args.offset });
            const result = await getReferences(this.tsClient, args as any);
            this.logger.debug('References result', { resultCount: result?.references?.length || 0 });
            return {
              content: [
                {
                  type: 'text',
                  text: result ? JSON.stringify(result, null, 2) : 'No references found',
                },
              ],
            };
          }

          case 'ts_rename': {
            this.logger.debug('Getting rename info', { file: args.file, line: args.line, offset: args.offset, newName: args.newName });
            const result = await getRename(this.tsClient, args as any);
            this.logger.debug('Rename result', { hasResult: !!result });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'ts_diagnostics': {
            this.logger.debug('Getting diagnostics', { file: args.file });
            const result = await getDiagnostics(this.tsClient, args as any);
            const syntacticCount = Array.isArray(result?.syntactic) ? result.syntactic.length : 0;
            const semanticCount = Array.isArray(result?.semantic) ? result.semantic.length : 0;
            this.logger.debug('Diagnostics result', { 
              syntacticCount,
              semanticCount,
              totalCount: syntacticCount + semanticCount,
            });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'ts_organize_imports': {
            this.logger.debug('Organizing imports', { file: args.file });
            const result = await organizeImports(this.tsClient, args as any);
            this.logger.debug('Organize imports result', { hasResult: !!result });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          default:
            this.logger.warn('Unknown tool requested', { toolName: name });
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error('Tool execution failed', { 
          toolName: name, 
          error: errorMessage,
          args: JSON.stringify(args),
        });
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start() {
    await this.configManager.load();
    this.logger.info('Starting TSServer MCP', { 
      version: '1.0.0',
      debugEnabled: this.configManager.getDebugConfig().enabled,
      logDirectory: this.logger.getLogDirectory(),
    });
    
    await this.tsClient.start();

    this.transport = new StdioServerTransport();
    
    // Monitor stdin/stdout for connection state
    this.setupConnectionMonitoring();
    
    await this.server.connect(this.transport);

    console.error('TSServer MCP started');
    this.logger.info('TSServer MCP started successfully');
  }

  private setupConnectionMonitoring() {
    // Monitor stdin for close/end events (client disconnection)
    process.stdin.on('close', () => {
      this.logger.info('stdin closed - client disconnected');
      this.handleConnectionLoss();
    });

    process.stdin.on('end', () => {
      this.logger.info('stdin ended - client disconnected');
      this.handleConnectionLoss();
    });

    process.stdin.on('error', (error) => {
      this.logger.warn('stdin error', { error: error.message });
      this.handleConnectionLoss();
    });

    // Monitor stdout for errors (broken pipe, etc.)
    process.stdout.on('error', (error) => {
      this.logger.warn('stdout error', { error: error.message });
      this.handleConnectionLoss();
    });
  }

  private handleConnectionLoss() {
    if (this.connectionLost) {
      return; // Already handling connection loss
    }
    
    this.connectionLost = true;
    this.logger.info('Connection lost - initiating graceful shutdown');
    
    // Give a brief moment for any final cleanup, then shutdown
    setTimeout(async () => {
      try {
        await this.stop();
        this.logger.info('Auto-shutdown completed successfully');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during auto-shutdown', { error });
        process.exit(1);
      }
    }, 1000); // 1 second delay for graceful cleanup
  }

  async stop() {
    this.logger.info('Stopping TSServer MCP');
    
    // Close the transport connection
    if (this.transport) {
      try {
        await this.transport.close();
        this.logger.debug('Transport closed successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error('Error closing transport', { error: errorMessage });
      }
      this.transport = null;
    }
    
    await this.tsClient.stop();
    this.logger.info('TSServer MCP stopped');
  }
}

async function main() {
  const mcp = new TSServerMCP();
  let isShuttingDown = false;
  const logger = getLogger();

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn('Force shutdown initiated', { signal });
      console.error('Force shutdown');
      process.exit(1);
    }
    
    isShuttingDown = true;
    logger.info('Shutdown initiated', { signal });
    console.error(`Received ${signal}, shutting down...`);
    
    try {
      await mcp.stop();
      logger.info('Shutdown completed successfully', { signal });
      console.error('Shutdown complete');
      process.exit(0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error during shutdown', { signal, error: errorMessage });
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGPIPE', () => shutdown('SIGPIPE'));
  
  // Handle process disconnection (when parent process exits)
  process.on('disconnect', () => shutdown('disconnect'));
  
  // Handle uncaught exceptions to ensure cleanup
  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught exception occurred', { error: error.message, stack: error.stack });
    console.error('Uncaught exception:', error);
    await shutdown('uncaughtException');
  });

  process.on('unhandledRejection', async (reason) => {
    logger.error('Unhandled rejection occurred', { reason: String(reason) });
    console.error('Unhandled rejection:', reason);
    await shutdown('unhandledRejection');
  });

  await mcp.start();
}

main().catch((error) => {
  console.error('Failed to start TSServer MCP:', error);
  process.exit(1);
});