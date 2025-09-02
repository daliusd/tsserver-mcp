import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getReferences } from '../../src/tools/references';
import { MockTSServerClient, mockReferencesResponse } from '../mocks';

describe('References Tool', () => {
  let mockClient: MockTSServerClient;

  beforeEach(() => {
    mockClient = new MockTSServerClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return references for a symbol', async () => {
    mockClient.setMockResponse('references', mockReferencesResponse);

    const result = await getReferences(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5
    });

    expect(result).toEqual({
      symbolName: 'testFunction',
      symbolDisplayString: 'function testFunction(): void',
      references: [
        {
          file: '/test/file.ts',
          line: 10,
          offset: 5,
          endLine: 10,
          endOffset: 15,
          kind: 'function',
          name: 'testFunction',
          containerKind: undefined,
          containerName: undefined
        },
        {
          file: '/test/other.ts',
          line: 5,
          offset: 1,
          endLine: 5,
          endOffset: 11,
          kind: 'function',
          name: 'testFunction',
          containerKind: undefined,
          containerName: undefined
        }
      ]
    });
  });

  it('should return null when no references found', async () => {
    mockClient.setMockResponse('references', undefined);

    const result = await getReferences(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5
    });

    expect(result).toBeNull();
  });

  it('should return null when response has no refs', async () => {
    const responseWithoutRefs = {
      symbolName: 'testFunction',
      symbolDisplayString: 'function testFunction(): void',
      refs: undefined
    };

    mockClient.setMockResponse('references', responseWithoutRefs);

    const result = await getReferences(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5
    });

    expect(result).toBeNull();
  });

  it('should handle empty refs array', async () => {
    const responseWithEmptyRefs = {
      symbolName: 'unusedFunction',
      symbolDisplayString: 'function unusedFunction(): void',
      refs: []
    };

    mockClient.setMockResponse('references', responseWithEmptyRefs);

    const result = await getReferences(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5
    });

    expect(result).toEqual({
      symbolName: 'unusedFunction',
      symbolDisplayString: 'function unusedFunction(): void',
      references: []
    });
  });

  it('should handle single reference', async () => {
    const singleRefResponse = {
      symbolName: 'privateVar',
      symbolDisplayString: 'let privateVar: string',
      refs: [
        {
          file: '/test/single.ts',
          start: { line: 3, offset: 5 },
          end: { line: 3, offset: 15 },
          kind: 'variable',
          name: 'privateVar'
        }
      ]
    };

    mockClient.setMockResponse('references', singleRefResponse);

    const result = await getReferences(mockClient as any, {
      file: '/test/single.ts',
      line: 3,
      offset: 5
    });

    expect(result?.references).toHaveLength(1);
    expect(result?.references[0]).toEqual({
      file: '/test/single.ts',
      line: 3,
      offset: 5,
      endLine: 3,
      endOffset: 15,
      kind: 'variable',
      name: 'privateVar',
      containerKind: undefined,
      containerName: undefined
    });
  });

  it('should call openFile and closeFile', async () => {
    const openFileSpy = vi.spyOn(mockClient, 'openFile');
    const closeFileSpy = vi.spyOn(mockClient, 'closeFile');
    const requestSpy = vi.spyOn(mockClient, 'request');

    mockClient.setMockResponse('references', mockReferencesResponse);

    const file = '/test/file.ts';
    await getReferences(mockClient as any, {
      file,
      line: 10,
      offset: 5
    });

    expect(openFileSpy).toHaveBeenCalledWith(file);
    expect(requestSpy).toHaveBeenCalledWith('references', {
      file,
      line: 10,
      offset: 5
    });
    expect(closeFileSpy).toHaveBeenCalledWith(file);
  });

  it('should close file even if request throws error', async () => {
    const closeFileSpy = vi.spyOn(mockClient, 'closeFile');
    
    mockClient.setMockResponse('references', new Error('Request failed'));

    const file = '/test/file.ts';
    
    await expect(getReferences(mockClient as any, {
      file,
      line: 10,
      offset: 5
    })).rejects.toThrow('Request failed');

    expect(closeFileSpy).toHaveBeenCalledWith(file);
  });

  it('should handle references across multiple files', async () => {
    const multiFileResponse = {
      symbolName: 'globalFunction',
      symbolDisplayString: 'function globalFunction(): number',
      refs: [
        {
          file: '/src/main.ts',
          start: { line: 1, offset: 1 },
          end: { line: 1, offset: 15 },
          kind: 'function',
          name: 'globalFunction',
          containerKind: 'module',
          containerName: 'main'
        },
        {
          file: '/src/utils.ts',
          start: { line: 10, offset: 20 },
          end: { line: 10, offset: 34 },
          kind: 'function',
          name: 'globalFunction'
        },
        {
          file: '/tests/main.test.ts',
          start: { line: 5, offset: 8 },
          end: { line: 5, offset: 22 },
          kind: 'function',
          name: 'globalFunction'
        }
      ]
    };

    mockClient.setMockResponse('references', multiFileResponse);

    const result = await getReferences(mockClient as any, {
      file: '/src/main.ts',
      line: 1,
      offset: 1
    });

    expect(result?.references).toHaveLength(3);
    expect(result?.references.map(ref => ref.file)).toEqual([
      '/src/main.ts',
      '/src/utils.ts', 
      '/tests/main.test.ts'
    ]);
  });

  it('should preserve container information when available', async () => {
    const responseWithContainers = {
      symbolName: 'methodName',
      symbolDisplayString: 'method methodName(): void',
      refs: [
        {
          file: '/test/class.ts',
          start: { line: 5, offset: 10 },
          end: { line: 5, offset: 20 },
          kind: 'method',
          name: 'methodName',
          containerKind: 'class',
          containerName: 'TestClass'
        }
      ]
    };

    mockClient.setMockResponse('references', responseWithContainers);

    const result = await getReferences(mockClient as any, {
      file: '/test/class.ts',
      line: 5,
      offset: 10
    });

    expect(result?.references[0]).toEqual({
      file: '/test/class.ts',
      line: 5,
      offset: 10,
      endLine: 5,
      endOffset: 20,
      kind: 'method',
      name: 'methodName',
      containerKind: 'class',
      containerName: 'TestClass'
    });
  });
});