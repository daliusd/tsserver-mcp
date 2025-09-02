import { CallToolRequest } from '@modelcontextprotocol/sdk/types';

// Mock MCP server for testing
export class MockMCPServer {
  private tools = new Map<string, Function>();

  registerTool(name: string, handler: Function): void {
    this.tools.set(name, handler);
  }

  async callTool(name: string, args: any): Promise<any> {
    const handler = this.tools.get(name);
    if (!handler) {
      throw new Error(`Tool ${name} not found`);
    }
    return handler(args);
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }
}

// Helper to create mock CallToolRequest
export function createMockCallToolRequest(toolName: string, args: any): CallToolRequest {
  return {
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
  };
}

// Helper to write temporary test files
export async function createTempFile(filename: string, content: string): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const os = await import('os');

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tsserver-mcp-test-'));
  const filePath = path.join(tempDir, filename);

  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}

// Helper to cleanup temporary files
export async function cleanupTempFile(filePath: string): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  try {
    await fs.unlink(filePath);
    await fs.rmdir(path.dirname(filePath));
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Helper to find a position in code
export function findPositionInCode(code: string, searchText: string): { line: number; offset: number } {
  const lines = code.split('\n');

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const offset = lines[lineIndex].indexOf(searchText);
    if (offset !== -1) {
      return {
        line: lineIndex + 1, // TSServer uses 1-based line numbers
        offset: offset + 1   // TSServer uses 1-based character offsets
      };
    }
  }

  throw new Error(`Text "${searchText}" not found in code`);
}

// Helper to validate MCP tool response format
export function validateMCPResponse(response: any): boolean {
  return (
    response &&
    typeof response === 'object' &&
    Array.isArray(response.content) &&
    response.content.length > 0 &&
    response.content[0].type === 'text' &&
    typeof response.content[0].text === 'string'
  );
}

// Helper to parse JSON from MCP response
export function parseMCPResponseJSON(response: any): any {
  if (!validateMCPResponse(response)) {
    throw new Error('Invalid MCP response format');
  }

  try {
    return JSON.parse(response.content[0].text);
  } catch (error) {
    throw new Error('Failed to parse MCP response JSON');
  }
}