import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDiagnostics } from '../../src/tools/diagnostics';
import { MockTSServerClient, mockSyntacticDiagnosticsResponse, mockSemanticDiagnosticsResponse, mockEmptyDiagnosticsResponse } from '../mocks';

describe('Diagnostics Tool', () => {
  let mockClient: MockTSServerClient;

  beforeEach(() => {
    mockClient = new MockTSServerClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return both syntactic and semantic diagnostics', async () => {
    mockClient.setMockResponse('syntacticDiagnosticsSync', mockSyntacticDiagnosticsResponse);
    mockClient.setMockResponse('semanticDiagnosticsSync', mockSemanticDiagnosticsResponse);

    const result = await getDiagnostics(mockClient as any, {
      file: '/test/file.ts'
    });

    expect(result).toEqual({
      syntactic: mockSyntacticDiagnosticsResponse,
      semantic: mockSemanticDiagnosticsResponse
    });
  });

  it('should handle empty diagnostics responses', async () => {
    mockClient.setMockResponse('syntacticDiagnosticsSync', mockEmptyDiagnosticsResponse);
    mockClient.setMockResponse('semanticDiagnosticsSync', mockEmptyDiagnosticsResponse);

    const result = await getDiagnostics(mockClient as any, {
      file: '/test/clean-file.ts'
    });

    expect(result).toEqual({
      syntactic: [],
      semantic: []
    });
  });

  it('should handle only syntactic errors', async () => {
    mockClient.setMockResponse('syntacticDiagnosticsSync', mockSyntacticDiagnosticsResponse);
    mockClient.setMockResponse('semanticDiagnosticsSync', mockEmptyDiagnosticsResponse);

    const result = await getDiagnostics(mockClient as any, {
      file: '/test/syntax-error-file.ts'
    });

    expect(result.syntactic).toHaveLength(1);
    expect(result.syntactic[0].text).toBe("';' expected.");
    expect(result.syntactic[0].code).toBe(1005);
    expect(result.semantic).toHaveLength(0);
  });

  it('should handle only semantic errors', async () => {
    mockClient.setMockResponse('syntacticDiagnosticsSync', mockEmptyDiagnosticsResponse);
    mockClient.setMockResponse('semanticDiagnosticsSync', mockSemanticDiagnosticsResponse);

    const result = await getDiagnostics(mockClient as any, {
      file: '/test/semantic-error-file.ts'
    });

    expect(result.syntactic).toHaveLength(0);
    expect(result.semantic).toHaveLength(2);
    expect(result.semantic[0].text).toBe("Cannot find name 'unknownVariable'.");
    expect(result.semantic[0].code).toBe(2304);
    expect(result.semantic[1].text).toBe("Type 'string' is not assignable to type 'number'.");
    expect(result.semantic[1].code).toBe(2322);
  });

  it('should call client with correct parameters', async () => {
    const requestSpy = vi.spyOn(mockClient, 'request');
    
    mockClient.setMockResponse('syntacticDiagnosticsSync', mockEmptyDiagnosticsResponse);
    mockClient.setMockResponse('semanticDiagnosticsSync', mockEmptyDiagnosticsResponse);

    const file = '/test/file.ts';
    await getDiagnostics(mockClient as any, { file });

    expect(requestSpy).toHaveBeenCalledWith('syntacticDiagnosticsSync', {
      file,
      includeLinePosition: true
    });
    expect(requestSpy).toHaveBeenCalledWith('semanticDiagnosticsSync', {
      file,
      includeLinePosition: true
    });
    expect(requestSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle diagnostic with line position information', async () => {
    const diagnosticWithPosition = [
      {
        start: { line: 1, offset: 1 },
        end: { line: 1, offset: 10 },
        startLocation: { line: 1, character: 0 },
        endLocation: { line: 1, character: 9 },
        text: "Cannot find module 'missing-module'.",
        code: 2307,
        category: 'error',
        source: 'ts'
      }
    ];

    mockClient.setMockResponse('syntacticDiagnosticsSync', mockEmptyDiagnosticsResponse);
    mockClient.setMockResponse('semanticDiagnosticsSync', diagnosticWithPosition);

    const result = await getDiagnostics(mockClient as any, {
      file: '/test/file.ts'
    });

    expect(result.semantic[0]).toMatchObject({
      start: { line: 1, offset: 1 },
      end: { line: 1, offset: 10 },
      startLocation: { line: 1, character: 0 },
      endLocation: { line: 1, character: 9 },
      text: "Cannot find module 'missing-module'.",
      code: 2307,
      category: 'error'
    });
  });

  it('should handle request failures gracefully', async () => {
    mockClient.setMockResponse('syntacticDiagnosticsSync', new Error('Syntactic diagnostics failed'));
    mockClient.setMockResponse('semanticDiagnosticsSync', mockSemanticDiagnosticsResponse);

    await expect(getDiagnostics(mockClient as any, {
      file: '/test/file.ts'
    })).rejects.toThrow('Syntactic diagnostics failed');
  });

  it('should handle different diagnostic categories', async () => {
    const mixedDiagnostics = [
      {
        start: { line: 5, offset: 1 },
        end: { line: 5, offset: 10 },
        text: "Variable 'x' is declared but never used.",
        code: 6196,
        category: 'warning',
        source: 'ts'
      },
      {
        start: { line: 10, offset: 1 },
        end: { line: 10, offset: 5 },
        text: "Prefer 'const' over 'let'.",
        code: 2540,
        category: 'suggestion',
        source: 'ts'
      }
    ];

    mockClient.setMockResponse('syntacticDiagnosticsSync', mockEmptyDiagnosticsResponse);
    mockClient.setMockResponse('semanticDiagnosticsSync', mixedDiagnostics);

    const result = await getDiagnostics(mockClient as any, {
      file: '/test/file.ts'
    });

    expect(result.semantic).toHaveLength(2);
    expect(result.semantic[0].category).toBe('warning');
    expect(result.semantic[1].category).toBe('suggestion');
  });

  it('should call openFile and closeFile', async () => {
    const openFileSpy = vi.spyOn(mockClient, 'openFile');
    const closeFileSpy = vi.spyOn(mockClient, 'closeFile');
    const requestSpy = vi.spyOn(mockClient, 'request');

    mockClient.setMockResponse('syntacticDiagnosticsSync', mockEmptyDiagnosticsResponse);
    mockClient.setMockResponse('semanticDiagnosticsSync', mockEmptyDiagnosticsResponse);

    const file = '/test/file.ts';
    await getDiagnostics(mockClient as any, { file });

    expect(openFileSpy).toHaveBeenCalledWith(file);
    expect(requestSpy).toHaveBeenCalledWith('syntacticDiagnosticsSync', {
      file,
      includeLinePosition: true
    });
    expect(requestSpy).toHaveBeenCalledWith('semanticDiagnosticsSync', {
      file,
      includeLinePosition: true
    });
    expect(closeFileSpy).toHaveBeenCalledWith(file);
  });

  it('should close file even if request throws error', async () => {
    const mockClient = new MockTSServerClient();
    const closeFileSpy = vi.spyOn(mockClient, 'closeFile');
    
    mockClient.setMockResponse('syntacticDiagnosticsSync', new Error('Request failed'));

    const file = '/test/file.ts';
    
    await expect(getDiagnostics(mockClient as any, { file })).rejects.toThrow('Request failed');

    expect(closeFileSpy).toHaveBeenCalledWith(file);
  });
});