// Additional test files for comprehensive testing scenarios

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    // Mock implementation
    return {
      data: {} as T,
      status: 200,
      message: 'Success'
    };
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    // Mock implementation
    return {
      data: {} as T,
      status: 201,
      message: 'Created'
    };
  }
}

// Generic utility functions
export function mapArray<T, U>(items: T[], mapper: (item: T) => U): U[] {
  return items.map(mapper);
}

export function filterItems<T>(items: T[], predicate: (item: T) => boolean): T[] {
  return items.filter(predicate);
}

// Async utility
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Complex type example
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export function mergeDeep<T>(target: T, source: DeepPartial<T>): T {
  // Mock implementation
  return { ...target, ...source } as T;
}