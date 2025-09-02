import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getHover } from '../../src/tools/hover';
import { MockTSServerClient, mockHoverResponse } from '../mocks';

describe('Hover Tool', () => {
  let mockClient: MockTSServerClient;

  beforeEach(() => {
    mockClient = new MockTSServerClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return hover information for a symbol', async () => {
    mockClient.setMockResponse('quickinfo', mockHoverResponse);

    const result = await getHover(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5
    });

    expect(result).toEqual({
      contents: '```typescript\nfunction testFunction(): void\n```\n\nA test function',
      range: {
        startLine: 10,
        startOffset: 5,
        endLine: 10,
        endOffset: 15
      }
    });
  });

  it('should return null when no hover information available', async () => {
    mockClient.setMockResponse('quickinfo', undefined);

    const result = await getHover(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5
    });

    expect(result).toBeNull();
  });

  it('should handle response with only displayString', async () => {
    const responseWithOnlyDisplayString = {
      ...mockHoverResponse,
      documentation: '',
      start: { line: 5, offset: 1 },
      end: { line: 5, offset: 10 }
    };

    mockClient.setMockResponse('quickinfo', responseWithOnlyDisplayString);

    const result = await getHover(mockClient as any, {
      file: '/test/file.ts',
      line: 5,
      offset: 1
    });

    expect(result).toEqual({
      contents: '```typescript\nfunction testFunction(): void\n```',
      range: {
        startLine: 5,
        startOffset: 1,
        endLine: 5,
        endOffset: 10
      }
    });
  });

  it('should handle response with only documentation', async () => {
    const responseWithOnlyDoc = {
      ...mockHoverResponse,
      displayString: '',
      start: { line: 8, offset: 3 },
      end: { line: 8, offset: 13 }
    };

    mockClient.setMockResponse('quickinfo', responseWithOnlyDoc);

    const result = await getHover(mockClient as any, {
      file: '/test/file.ts',
      line: 8,
      offset: 3
    });

    expect(result).toEqual({
      contents: 'A test function',
      range: {
        startLine: 8,
        startOffset: 3,
        endLine: 8,
        endOffset: 13
      }
    });
  });

  it('should handle response without range information', async () => {
    const responseWithoutRange = {
      displayString: 'let variable: string',
      documentation: 'A string variable'
    };

    mockClient.setMockResponse('quickinfo', responseWithoutRange);

    const result = await getHover(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5
    });

    expect(result).toEqual({
      contents: '```typescript\nlet variable: string\n```\n\nA string variable'
    });
    expect(result?.range).toBeUndefined();
  });

  it('should handle empty response', async () => {
    const emptyResponse = {
      displayString: '',
      documentation: ''
    };

    mockClient.setMockResponse('quickinfo', emptyResponse);

    const result = await getHover(mockClient as any, {
      file: '/test/file.ts',
      line: 10,
      offset: 5
    });

    expect(result).toEqual({
      contents: ''
    });
  });

  it('should call openFile and closeFile', async () => {
    const openFileSpy = vi.spyOn(mockClient, 'openFile');
    const closeFileSpy = vi.spyOn(mockClient, 'closeFile');
    const requestSpy = vi.spyOn(mockClient, 'request');

    mockClient.setMockResponse('quickinfo', mockHoverResponse);

    const file = '/test/file.ts';
    await getHover(mockClient as any, {
      file,
      line: 10,
      offset: 5
    });

    expect(openFileSpy).toHaveBeenCalledWith(file);
    expect(requestSpy).toHaveBeenCalledWith('quickinfo', {
      file,
      line: 10,
      offset: 5
    });
    expect(closeFileSpy).toHaveBeenCalledWith(file);
  });

  it('should close file even if request throws error', async () => {
    const mockClient = new MockTSServerClient();
    const closeFileSpy = vi.spyOn(mockClient, 'closeFile');
    
    mockClient.setMockResponse('quickinfo', new Error('Request failed'));

    const file = '/test/file.ts';
    
    const result = await getHover(mockClient as any, {
      file,
      line: 10,
      offset: 5
    });

    expect(result).toBeNull();
    expect(closeFileSpy).toHaveBeenCalledWith(file);
  });

  it('should format TypeScript code in code blocks', async () => {
    const complexTypeResponse = {
      displayString: 'interface User {\n  id: number;\n  name: string;\n}',
      documentation: 'User interface definition',
      start: { line: 1, offset: 1 },
      end: { line: 4, offset: 1 }
    };

    mockClient.setMockResponse('quickinfo', complexTypeResponse);

    const result = await getHover(mockClient as any, {
      file: '/test/file.ts',
      line: 1,
      offset: 1
    });

    expect(result?.contents).toContain('```typescript\n');
    expect(result?.contents).toContain('interface User {');
    expect(result?.contents).toContain('\n```');
    expect(result?.contents).toContain('User interface definition');
  });
});