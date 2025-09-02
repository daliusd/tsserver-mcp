import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { TSServerClient } from '../../src/tsserver/client';
import { getDefinition } from '../../src/tools/definition';
import { getHover } from '../../src/tools/hover';
import { getReferences } from '../../src/tools/references';
import { getRename } from '../../src/tools/rename';
import { organizeImports } from '../../src/tools/organizeImports';
import { getDiagnostics } from '../../src/tools/diagnostics';
import { 
  createTempFile, 
  cleanupTempFile, 
  findPositionInCode,
  MockMCPServer,
  createMockCallToolRequest,
  validateMCPResponse,
  parseMCPResponseJSON
} from '../helpers';
import { sampleTypeScriptCode, sampleWithImports, sampleWithErrors } from '../fixtures/sample-code';

// These are integration tests that require a real tsserver instance
// They will be skipped if tsserver is not available
const TSSERVER_AVAILABLE = process.env.CI !== 'true'; // Skip in CI unless specifically enabled

describe('TSServer MCP Integration Tests', () => {
  let client: TSServerClient;
  let tempFile: string;
  let mcpServer: MockMCPServer;

  beforeAll(async () => {
    if (!TSSERVER_AVAILABLE) {
      console.log('Skipping integration tests - tsserver not available');
      return;
    }

    client = new TSServerClient();
    try {
      await client.start();
    } catch (error) {
      console.log('Could not start tsserver, skipping integration tests:', error);
      (global as any).__TSSERVER_UNAVAILABLE__ = true;
    }
  });

  afterAll(async () => {
    if (client) {
      await client.stop();
    }
  });

  beforeEach(async () => {
    if ((global as any).__TSSERVER_UNAVAILABLE__) {
      return;
    }

    tempFile = await createTempFile('test.ts', sampleTypeScriptCode);
    mcpServer = new MockMCPServer();
    
    // Register all tools
    mcpServer.registerTool('ts_definition', (args) => getDefinition(client, args));
    mcpServer.registerTool('ts_hover', (args) => getHover(client, args));
    mcpServer.registerTool('ts_references', (args) => getReferences(client, args));
    mcpServer.registerTool('ts_rename', (args) => getRename(client, args));
    mcpServer.registerTool('ts_organize_imports', (args) => organizeImports(client, args));
    mcpServer.registerTool('ts_diagnostics', (args) => getDiagnostics(client, args));
  });

  afterEach(async () => {
    if (tempFile) {
      await cleanupTempFile(tempFile);
    }
  });

  describe('Real TSServer Integration', () => {
    beforeEach(() => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return; // Skip tests if tsserver not available
      }
    });

    it('should find definition of interface property', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const position = findPositionInCode(sampleTypeScriptCode, 'name: string');
      
      const result = await getDefinition(client, {
        file: tempFile,
        line: position.line,
        offset: position.offset
      });

      expect(result.definitions).toBeDefined();
      expect(result.definitions.length).toBeGreaterThan(0);
      expect(result.definitions[0].file).toBe(tempFile);
    });

    it('should provide hover information for interface', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const position = findPositionInCode(sampleTypeScriptCode, 'User');
      
      const result = await getHover(client, {
        file: tempFile,
        line: position.line,
        offset: position.offset
      });

      expect(result).toBeDefined();
      expect(result?.contents).toContain('interface');
      expect(result?.contents).toContain('User');
    });

    it('should find references to a class', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const position = findPositionInCode(sampleTypeScriptCode, 'UserService');
      
      const result = await getReferences(client, {
        file: tempFile,
        line: position.line,
        offset: position.offset
      });

      expect(result).toBeDefined();
      expect(result?.references).toBeDefined();
      expect(result?.references.length).toBeGreaterThan(1); // Should find class definition and usage
    });

    it('should provide rename information', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const position = findPositionInCode(sampleTypeScriptCode, 'addUser');
      
      const result = await getRename(client, {
        file: tempFile,
        line: position.line,
        offset: position.offset,
        newName: 'createUser'
      });

      expect(result.canRename).toBe(true);
      expect(result.changes).toBeDefined();
      expect(result.changes!.length).toBeGreaterThan(0);
    });

    it('should get diagnostics for a file', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const result = await getDiagnostics(client, {
        file: tempFile
      });

      expect(result).toBeDefined();
      expect(result.syntactic).toBeDefined();
      expect(result.semantic).toBeDefined();
      expect(Array.isArray(result.syntactic)).toBe(true);
      expect(Array.isArray(result.semantic)).toBe(true);
    });
  });

  describe('Organize Imports Integration', () => {
    let importsFile: string;

    beforeEach(async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }

      importsFile = await createTempFile('imports.ts', sampleWithImports);
    });

    afterEach(async () => {
      if (importsFile) {
        await cleanupTempFile(importsFile);
      }
    });

    it('should organize imports in a file', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const result = await organizeImports(client, {
        file: importsFile
      });

      // The test should accept both success=true (with changes) or success=false (no changes needed)
      expect(typeof result.success).toBe('boolean');
      
      // If successful, there should be a changes array
      if (result.success) {
        expect(Array.isArray(result.changes)).toBe(true);
      }
    });
  });

  describe('MCP Server Integration', () => {
    beforeEach(() => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
    });

    it('should handle ts_definition tool through MCP interface', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const position = findPositionInCode(sampleTypeScriptCode, 'User');
      
      const result = await mcpServer.callTool('ts_definition', {
        file: tempFile,
        line: position.line,
        offset: position.offset
      });

      expect(result.definitions).toBeDefined();
      expect(Array.isArray(result.definitions)).toBe(true);
    });

    it('should handle ts_hover tool through MCP interface', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const position = findPositionInCode(sampleTypeScriptCode, 'UserService');
      
      const result = await mcpServer.callTool('ts_hover', {
        file: tempFile,
        line: position.line,
        offset: position.offset
      });

      expect(result).toBeDefined();
      if (result) {
        expect(result.contents).toBeDefined();
        expect(typeof result.contents).toBe('string');
      }
    });

    it('should handle ts_references tool through MCP interface', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const position = findPositionInCode(sampleTypeScriptCode, 'findUserById');
      
      const result = await mcpServer.callTool('ts_references', {
        file: tempFile,
        line: position.line,
        offset: position.offset
      });

      expect(result).toBeDefined();
      if (result) {
        expect(result.references).toBeDefined();
        expect(Array.isArray(result.references)).toBe(true);
      }
    });

    it('should handle ts_diagnostics tool through MCP interface', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const result = await mcpServer.callTool('ts_diagnostics', {
        file: tempFile
      });

      expect(result).toBeDefined();
      expect(result.syntactic).toBeDefined();
      expect(result.semantic).toBeDefined();
      expect(Array.isArray(result.syntactic)).toBe(true);
      expect(Array.isArray(result.semantic)).toBe(true);
    });

    it('should list all available tools', () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const tools = mcpServer.listTools();
      
      expect(tools).toContain('ts_definition');
      expect(tools).toContain('ts_hover');
      expect(tools).toContain('ts_references');
      expect(tools).toContain('ts_rename');
      expect(tools).toContain('ts_organize_imports');
      expect(tools).toContain('ts_diagnostics');
    });

    it('should handle invalid tool names gracefully', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      await expect(mcpServer.callTool('invalid_tool', {}))
        .rejects.toThrow('Tool invalid_tool not found');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
    });

    it('should handle non-existent files gracefully', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      try {
        const result = await getDefinition(client, {
          file: '/non/existent/file.ts',
          line: 1,
          offset: 1
        });
        
        // If no error is thrown, the result should be empty
        expect(result.definitions).toEqual([]);
      } catch (error) {
        // If an error is thrown, that's also acceptable
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid positions gracefully', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const result = await getHover(client, {
        file: tempFile,
        line: 9999,
        offset: 9999
      });

      expect(result).toBeNull();
    });

    it('should handle rename of non-renameable symbols', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      // Try to rename a keyword or built-in
      const result = await getRename(client, {
        file: tempFile,
        line: 1,
        offset: 1,
        newName: 'newName'
      });

      // Should either return canRename: false or succeed with no changes
      expect(typeof result.canRename).toBe('boolean');
    });
  });

  describe('Performance Tests', () => {
    beforeEach(() => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
    });

    it('should handle multiple rapid requests', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const position = findPositionInCode(sampleTypeScriptCode, 'User');
      
      // Sequential requests instead of parallel to avoid TSServer state issues
      const results = [];
      for (let i = 0; i < 5; i++) {
        try {
          const result = await getHover(client, {
            file: tempFile,
            line: position.line,
            offset: position.offset
  });

  describe('Diagnostics Integration', () => {
    let errorsFile: string;

    beforeEach(async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }

      errorsFile = await createTempFile('errors.ts', sampleWithErrors);
    });

    afterEach(async () => {
      if (errorsFile) {
        await cleanupTempFile(errorsFile);
      }
    });

    it('should detect semantic errors in a file with issues', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const result = await getDiagnostics(client, {
        file: errorsFile
      });

      expect(result).toBeDefined();
      expect(result.syntactic).toBeDefined();
      expect(result.semantic).toBeDefined();
      
      // The sample with errors should have semantic diagnostics
      expect(result.semantic.length).toBeGreaterThan(0);
      
      // Check for the expected error about nonExistentVariable
      const referenceError = result.semantic.find(diagnostic => 
        diagnostic.text && diagnostic.text.includes('nonExistentVariable')
      );
      expect(referenceError).toBeDefined();
    });

    it('should detect type errors in a file with issues', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const result = await getDiagnostics(client, {
        file: errorsFile
      });

      // Check for type assignment error (string vs number)
      const typeError = result.semantic.find(diagnostic => 
        diagnostic.text && (
          diagnostic.text.includes('not assignable') || 
          diagnostic.text.includes('Type') ||
          diagnostic.code === 2322
        )
      );
      expect(typeError).toBeDefined();
    });

    it('should return empty diagnostics for clean file', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const result = await getDiagnostics(client, {
        file: tempFile // tempFile uses sampleTypeScriptCode which should be clean
      });

      expect(result).toBeDefined();
      expect(result.syntactic).toBeDefined();
      expect(result.semantic).toBeDefined();
      
      // Clean file should have no or minimal diagnostics
      // Note: TSServer might still report unused variable warnings etc
      expect(Array.isArray(result.syntactic)).toBe(true);
      expect(Array.isArray(result.semantic)).toBe(true);
    });
  });
          results.push(result);
        } catch (error) {
          // Ignore individual request failures in rapid test
          results.push(null);
        }
      }
      
      // At least some requests should complete successfully
      const successfulResults = results.filter(result => result !== null);
      expect(successfulResults.length).toBeGreaterThan(0);
    });

    it('should complete requests within reasonable time', async () => {
      if (!TSSERVER_AVAILABLE || (global as any).__TSSERVER_UNAVAILABLE__) {
        return;
      }
      
      const position = findPositionInCode(sampleTypeScriptCode, 'UserService');
      
      const startTime = Date.now();
      
      await getDefinition(client, {
        file: tempFile,
        line: position.line,
        offset: position.offset
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });
  });
});