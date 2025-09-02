import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { organizeImports } from '../../src/tools/organizeImports';
import { MockTSServerClient, mockOrganizeImportsResponse } from '../mocks';

describe('Organize Imports Tool', () => {
  let mockClient: MockTSServerClient;

  beforeEach(() => {
    mockClient = new MockTSServerClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return organize imports changes when successful', async () => {
    mockClient.setMockResponse('organizeImports', mockOrganizeImportsResponse);

    const result = await organizeImports(mockClient as any, {
      file: '/test/file.ts'
    });

    expect(result).toEqual({
      success: true,
      changes: [
        {
          newText: 'import { util } from "./util";\n',
          span: {
            startLine: 1,
            startOffset: 1,
            endLine: 2,
            endOffset: 1
          }
        }
      ]
    });
  });

  it('should return success false when no changes available', async () => {
    mockClient.setMockResponse('organizeImports', []);

    const result = await organizeImports(mockClient as any, {
      file: '/test/file.ts'
    });

    expect(result).toEqual({
      success: false
    });
  });

  it('should return success false when response is undefined', async () => {
    mockClient.setMockResponse('organizeImports', undefined);

    const result = await organizeImports(mockClient as any, {
      file: '/test/file.ts'
    });

    expect(result).toEqual({
      success: false
    });
  });

  it('should return success false when response is null', async () => {
    mockClient.setMockResponse('organizeImports', null);

    const result = await organizeImports(mockClient as any, {
      file: '/test/file.ts'
    });

    expect(result).toEqual({
      success: false
    });
  });

  it('should handle multiple import changes', async () => {
    const multipleChangesResponse = [
      {
        newText: 'import { Component } from "react";\n',
        span: {
          start: { line: 1, offset: 1 },
          end: { line: 1, offset: 30 }
        }
      },
      {
        newText: 'import { useState } from "react";\n',
        span: {
          start: { line: 2, offset: 1 },
          end: { line: 2, offset: 25 }
        }
      },
      {
        newText: 'import { utils } from "./utils";\n',
        span: {
          start: { line: 3, offset: 1 },
          end: { line: 4, offset: 1 }
        }
      }
    ];

    mockClient.setMockResponse('organizeImports', multipleChangesResponse);

    const result = await organizeImports(mockClient as any, {
      file: '/test/file.ts'
    });

    expect(result.success).toBe(true);
    expect(result.changes).toHaveLength(3);
    expect(result.changes![0]).toEqual({
      newText: 'import { Component } from "react";\n',
      span: {
        startLine: 1,
        startOffset: 1,
        endLine: 1,
        endOffset: 30
      }
    });
  });

  it('should handle empty newText', async () => {
    const emptyTextResponse = [
      {
        newText: '',
        span: {
          start: { line: 1, offset: 1 },
          end: { line: 2, offset: 1 }
        }
      }
    ];

    mockClient.setMockResponse('organizeImports', emptyTextResponse);

    const result = await organizeImports(mockClient as any, {
      file: '/test/file.ts'
    });

    expect(result.success).toBe(true);
    expect(result.changes![0].newText).toBe('');
  });

  it('should handle missing newText property', async () => {
    const missingTextResponse = [
      {
        span: {
          start: { line: 1, offset: 1 },
          end: { line: 2, offset: 1 }
        }
      }
    ];

    mockClient.setMockResponse('organizeImports', missingTextResponse);

    const result = await organizeImports(mockClient as any, {
      file: '/test/file.ts'
    });

    expect(result.success).toBe(true);
    expect(result.changes![0].newText).toBe('');
  });

  it('should call openFile and closeFile', async () => {
    const openFileSpy = vi.spyOn(mockClient, 'openFile');
    const closeFileSpy = vi.spyOn(mockClient, 'closeFile');
    const requestSpy = vi.spyOn(mockClient, 'request');

    mockClient.setMockResponse('organizeImports', mockOrganizeImportsResponse);

    const file = '/test/file.ts';
    await organizeImports(mockClient as any, {
      file
    });

    expect(openFileSpy).toHaveBeenCalledWith(file);
    expect(requestSpy).toHaveBeenCalledWith('organizeImports', {
      file
    });
    expect(closeFileSpy).toHaveBeenCalledWith(file);
  });

  it('should close file even if request throws error', async () => {
    const closeFileSpy = vi.spyOn(mockClient, 'closeFile');
    
    mockClient.setMockResponse('organizeImports', new Error('Request failed'));

    const file = '/test/file.ts';
    
    const result = await organizeImports(mockClient as any, {
      file
    });

    expect(result).toEqual({ success: false });
    expect(closeFileSpy).toHaveBeenCalledWith(file);
  });

  it('should handle request errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
    
    mockClient.setMockResponse('organizeImports', new Error('TSServer error'));

    const result = await organizeImports(mockClient as any, {
      file: '/test/file.ts'
    });

    expect(result).toEqual({ success: false });
    expect(consoleSpy).toHaveBeenCalledWith('Error organizing imports:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('should handle complex import reorganization', async () => {
    const complexReorganizationResponse = [
      {
        newText: 'import * as fs from "fs";\nimport * as path from "path";\n\nimport { Component, ReactNode } from "react";\n\nimport { localUtil } from "./utils/local";\nimport { helper } from "./helper";\n',
        span: {
          start: { line: 1, offset: 1 },
          end: { line: 10, offset: 1 }
        }
      }
    ];

    mockClient.setMockResponse('organizeImports', complexReorganizationResponse);

    const result = await organizeImports(mockClient as any, {
      file: '/test/complex.ts'
    });

    expect(result.success).toBe(true);
    expect(result.changes![0].newText).toContain('import * as fs from "fs"');
    expect(result.changes![0].newText).toContain('import { Component, ReactNode } from "react"');
    expect(result.changes![0].newText).toContain('import { localUtil } from "./utils/local"');
  });

  it('should preserve span information correctly', async () => {
    const preserveSpanResponse = [
      {
        newText: 'import { test } from "test";\n',
        span: {
          start: { line: 5, offset: 10 },
          end: { line: 8, offset: 25 }
        }
      }
    ];

    mockClient.setMockResponse('organizeImports', preserveSpanResponse);

    const result = await organizeImports(mockClient as any, {
      file: '/test/file.ts'
    });

    expect(result.changes![0].span).toEqual({
      startLine: 5,
      startOffset: 10,
      endLine: 8,
      endOffset: 25
    });
  });
});