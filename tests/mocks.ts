import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
import { vi } from 'vitest';

export class MockTSServerClient extends EventEmitter {
  private mockResponses = new Map<string, any>();
  private sequence = 1;

  constructor() {
    super();
  }

  setMockResponse(command: string, response: any): void {
    this.mockResponses.set(command, response);
  }

  async start(): Promise<void> {
    // Mock implementation - no actual process
    return Promise.resolve();
  }

  async request<T = any>(command: string, args?: any): Promise<T> {
    const response = this.mockResponses.get(command);
    if (response instanceof Error) {
      throw response;
    }
    if (this.mockResponses.has(command)) {
      return response;
    }
    throw new Error(`No mock response set for command: ${command}`);
  }

  async openFile(file: string): Promise<void> {
    // Mock implementation
    return Promise.resolve();
  }

  async closeFile(file: string): Promise<void> {
    // Mock implementation
    return Promise.resolve();
  }

  async stop(): Promise<void> {
    // Mock implementation
    return Promise.resolve();
  }
}

export const createMockChildProcess = (): Partial<ChildProcess> => ({
  stdout: {
    setEncoding: vi.fn(),
    on: vi.fn(),
  } as any,
  stdin: {
    write: vi.fn(),
  } as any,
  stderr: {
    on: vi.fn(),
  } as any,
  on: vi.fn(),
  kill: vi.fn(),
});

export const mockDefinitionResponse = [
  {
    file: '/test/file.ts',
    start: { line: 10, offset: 5 },
    end: { line: 10, offset: 15 },
    kind: 'function',
    name: 'testFunction',
    containerKind: '',
    containerName: ''
  }
];

export const mockHoverResponse = {
  kind: 'function',
  kindModifiers: '',
  start: { line: 10, offset: 5 },
  end: { line: 10, offset: 15 },
  displayString: 'function testFunction(): void',
  documentation: 'A test function'
};

export const mockReferencesResponse = {
  refs: [
    {
      file: '/test/file.ts',
      start: { line: 10, offset: 5 },
      end: { line: 10, offset: 15 },
      kind: 'function',
      name: 'testFunction'
    },
    {
      file: '/test/other.ts',
      start: { line: 5, offset: 1 },
      end: { line: 5, offset: 11 },
      kind: 'function',
      name: 'testFunction'
    }
  ],
  symbolName: 'testFunction',
  symbolDisplayString: 'function testFunction(): void',
  symbolStartOffset: 5,
  symbolKind: 'function'
};

export const mockRenameResponse = {
  info: {
    canRename: true,
    displayName: 'testFunction',
    fullDisplayName: 'testFunction',
    kind: 'function',
    kindModifiers: ''
  },
  locs: [
    {
      file: '/test/file.ts',
      locs: [
        {
          start: { line: 10, offset: 5 },
          end: { line: 10, offset: 15 }
        }
      ]
    }
  ]
};

export const mockOrganizeImportsResponse = [
  {
    newText: 'import { util } from "./util";\n',
    span: {
      start: { line: 1, offset: 1 },
      end: { line: 2, offset: 1 }
    }
  }
];

export const mockSyntacticDiagnosticsResponse = [
  {
    start: { line: 5, offset: 10 },
    end: { line: 5, offset: 15 },
    text: "';' expected.",
    code: 1005,
    category: 'error',
    source: 'ts'
  }
];

export const mockSemanticDiagnosticsResponse = [
  {
    start: { line: 10, offset: 5 },
    end: { line: 10, offset: 15 },
    text: "Cannot find name 'unknownVariable'.",
    code: 2304,
    category: 'error',
    source: 'ts'
  },
  {
    start: { line: 15, offset: 8 },
    end: { line: 15, offset: 20 },
    text: "Type 'string' is not assignable to type 'number'.",
    code: 2322,
    category: 'error',
    source: 'ts'
  }
];

export const mockEmptyDiagnosticsResponse = [];