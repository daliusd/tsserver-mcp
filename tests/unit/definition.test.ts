import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDefinition } from '../../src/tools/definition';
import { MockTSServerClient, mockDefinitionResponse } from '../mocks';

describe('Definition Tool', () => {
  let mockClient: MockTSServerClient;

  beforeEach(() => {
    mockClient = new MockTSServerClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return definition information for a symbol', async () => {
    mockClient.setMockResponse('definition', mockDefinitionResponse);

    const result = await getDefinition(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5
    });

    expect(result).toEqual({
      definitions: [
        {
          file: '/test/file.ts',
          line: 10,
          offset: 5,
          endLine: 10,
          endOffset: 15,
          kind: 'function',
          name: 'testFunction',
          containerKind: '',
          containerName: ''
        }
      ]
    });
  });

  it('should return empty definitions when no results found', async () => {
    mockClient.setMockResponse('definition', []);

    const result = await getDefinition(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5
    });

    expect(result).toEqual({
      definitions: []
    });
  });

  it('should handle undefined response', async () => {
    mockClient.setMockResponse('definition', undefined);

    const result = await getDefinition(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5
    });

    expect(result).toEqual({
      definitions: []
    });
  });

  it('should handle null response', async () => {
    mockClient.setMockResponse('definition', null);

    const result = await getDefinition(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5
    });

    expect(result).toEqual({
      definitions: []
    });
  });

  it('should call openFile and closeFile', async () => {
    const openFileSpy = vi.spyOn(mockClient, 'openFile');
    const closeFileSpy = vi.spyOn(mockClient, 'closeFile');
    const requestSpy = vi.spyOn(mockClient, 'request');

    mockClient.setMockResponse('definition', mockDefinitionResponse);

    const file = '/test/file.ts';
    await getDefinition(mockClient as any, {
      file,
      line: 10,
      offset: 5
    });

    expect(openFileSpy).toHaveBeenCalledWith(file);
    expect(requestSpy).toHaveBeenCalledWith('definition', {
      file,
      line: 10,
      offset: 5
    });
    expect(closeFileSpy).toHaveBeenCalledWith(file);
  });

  it('should close file even if request throws error', async () => {
    const closeFileSpy = vi.spyOn(mockClient, 'closeFile');
    
    mockClient.setMockResponse('definition', new Error('Request failed'));

    const file = '/test/file.ts';
    
    await expect(getDefinition(mockClient as any, {
      file,
      line: 10,
      offset: 5
    })).rejects.toThrow('Request failed');

    expect(closeFileSpy).toHaveBeenCalledWith(file);
  });

  it('should handle multiple definitions', async () => {
    const multipleDefinitions = [
      {
        file: '/test/file1.ts',
        start: { line: 5, offset: 10 },
        end: { line: 5, offset: 20 },
        kind: 'variable',
        name: 'myVar'
      },
      {
        file: '/test/file2.ts',
        start: { line: 15, offset: 5 },
        end: { line: 15, offset: 15 },
        kind: 'function',
        name: 'myFunc'
      }
    ];

    mockClient.setMockResponse('definition', multipleDefinitions);

    const result = await getDefinition(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5
    });

    expect(result.definitions).toHaveLength(2);
    expect(result.definitions[0]).toEqual({
      file: '/test/file1.ts',
      line: 5,
      offset: 10,
      endLine: 5,
      endOffset: 20,
      kind: 'variable',
      name: 'myVar',
      containerKind: undefined,
      containerName: undefined
    });
    expect(result.definitions[1]).toEqual({
      file: '/test/file2.ts',
      line: 15,
      offset: 5,
      endLine: 15,
      endOffset: 15,
      kind: 'function',
      name: 'myFunc',
      containerKind: undefined,
      containerName: undefined
    });
  });
});