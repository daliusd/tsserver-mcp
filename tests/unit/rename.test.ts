import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getRename } from '../../src/tools/rename';
import { MockTSServerClient, mockRenameResponse } from '../mocks';

describe('Rename Tool', () => {
  let mockClient: MockTSServerClient;

  beforeEach(() => {
    mockClient = new MockTSServerClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return rename information when symbol can be renamed', async () => {
    mockClient.setMockResponse('rename', mockRenameResponse);

    const result = await getRename(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5,
      newName: 'newTestFunction'
    });

    expect(result).toEqual({
      canRename: true,
      displayName: 'testFunction',
      fullDisplayName: 'testFunction',
      kind: 'function',
      changes: [
        {
          file: '/test/file.ts',
          edits: [
            {
              startLine: 10,
              startOffset: 5,
              endLine: 10,
              endOffset: 15,
              newText: 'newTestFunction'
            }
          ]
        }
      ]
    });
  });

  it('should return canRename false when symbol cannot be renamed', async () => {
    const cannotRenameResponse = {
      info: {
        canRename: false,
        localizedErrorMessage: 'Cannot rename this symbol'
      },
      locs: []
    };

    mockClient.setMockResponse('rename', cannotRenameResponse);

    const result = await getRename(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5,
      newName: 'newName'
    });

    expect(result).toEqual({
      canRename: false,
      localizedErrorMessage: 'Cannot rename this symbol'
    });
  });

  it('should handle undefined response', async () => {
    mockClient.setMockResponse('rename', undefined);

    const result = await getRename(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5,
      newName: 'newName'
    });

    expect(result).toEqual({
      canRename: false,
      localizedErrorMessage: 'Cannot rename symbol'
    });
  });

  it('should handle response without info', async () => {
    const responseWithoutInfo = {
      locs: []
    };

    mockClient.setMockResponse('rename', responseWithoutInfo);

    const result = await getRename(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5,
      newName: 'newName'
    });

    expect(result).toEqual({
      canRename: false,
      localizedErrorMessage: 'Cannot rename symbol'
    });
  });

  it('should handle multiple file changes', async () => {
    const multiFileRenameResponse = {
      info: {
        canRename: true,
        displayName: 'globalVar',
        fullDisplayName: 'globalVar',
        kind: 'variable'
      },
      locs: [
        {
          file: '/test/file1.ts',
          locs: [
            {
              start: { line: 1, offset: 5 },
              end: { line: 1, offset: 14 }
            },
            {
              start: { line: 10, offset: 10 },
              end: { line: 10, offset: 19 }
            }
          ]
        },
        {
          file: '/test/file2.ts',
          locs: [
            {
              start: { line: 5, offset: 15 },
              end: { line: 5, offset: 24 }
            }
          ]
        }
      ]
    };

    mockClient.setMockResponse('rename', multiFileRenameResponse);

    const result = await getRename(mockClient as any, {
      file: '/test/file1.ts',
      line: 1,
      offset: 5,
      newName: 'newGlobalVar'
    });

    expect(result.canRename).toBe(true);
    expect(result.changes).toHaveLength(2);
    
    expect(result.changes![0]).toEqual({
      file: '/test/file1.ts',
      edits: [
        {
          startLine: 1,
          startOffset: 5,
          endLine: 1,
          endOffset: 14,
          newText: 'newGlobalVar'
        },
        {
          startLine: 10,
          startOffset: 10,
          endLine: 10,
          endOffset: 19,
          newText: 'newGlobalVar'
        }
      ]
    });

    expect(result.changes![1]).toEqual({
      file: '/test/file2.ts',
      edits: [
        {
          startLine: 5,
          startOffset: 15,
          endLine: 5,
          endOffset: 24,
          newText: 'newGlobalVar'
        }
      ]
    });
  });

  it('should handle empty locations array', async () => {
    const emptyLocsResponse = {
      info: {
        canRename: true,
        displayName: 'unusedVar',
        fullDisplayName: 'unusedVar',
        kind: 'variable'
      },
      locs: []
    };

    mockClient.setMockResponse('rename', emptyLocsResponse);

    const result = await getRename(mockClient as any, {
      file: '/test/file.ts',
      line: 1,
      offset: 1,
      newName: 'newUnusedVar'
    });

    expect(result.canRename).toBe(true);
    expect(result.changes).toEqual([]);
  });

  it('should call openFile and closeFile', async () => {
    const openFileSpy = vi.spyOn(mockClient, 'openFile');
    const closeFileSpy = vi.spyOn(mockClient, 'closeFile');
    const requestSpy = vi.spyOn(mockClient, 'request');

    mockClient.setMockResponse('rename', mockRenameResponse);

    const file = '/test/file.ts';
    await getRename(mockClient as any, {
      file,
      line: 10,
      offset: 5,
      newName: 'newName'
    });

    expect(openFileSpy).toHaveBeenCalledWith(file);
    expect(requestSpy).toHaveBeenCalledWith('rename', {
      file,
      line: 10,
      offset: 5
    });
    expect(closeFileSpy).toHaveBeenCalledWith(file);
  });

  it('should close file even if request throws error', async () => {
    const closeFileSpy = vi.spyOn(mockClient, 'closeFile');
    
    mockClient.setMockResponse('rename', new Error('Request failed'));

    const file = '/test/file.ts';
    
    await expect(getRename(mockClient as any, {
      file,
      line: 10,
      offset: 5,
      newName: 'newName'
    })).rejects.toThrow('Request failed');

    expect(closeFileSpy).toHaveBeenCalledWith(file);
  });

  it('should use provided newName in edits', async () => {
    mockClient.setMockResponse('rename', mockRenameResponse);

    const result = await getRename(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5,
      newName: 'customNewName'
    });

    expect(result.changes![0].edits[0].newText).toBe('customNewName');
  });

  it('should preserve optional rename info fields', async () => {
    const detailedRenameResponse = {
      info: {
        canRename: true,
        displayName: 'MyClass',
        fullDisplayName: 'namespace.MyClass',
        kind: 'class',
        kindModifiers: 'export'
      },
      locs: [
        {
          file: '/test/class.ts',
          locs: [
            {
              start: { line: 1, offset: 1 },
              end: { line: 1, offset: 8 }
            }
          ]
        }
      ]
    };

    mockClient.setMockResponse('rename', detailedRenameResponse);

    const result = await getRename(mockClient as any, {
      file: '/test/class.ts',
      line: 1,
      offset: 1,
      newName: 'RenamedClass'
    });

    expect(result.canRename).toBe(true);
    expect(result.displayName).toBe('MyClass');
    expect(result.fullDisplayName).toBe('namespace.MyClass');
    expect(result.kind).toBe('class');
  });
});