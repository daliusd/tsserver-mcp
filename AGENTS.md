# Agent Guidelines for tsserver-mcp

For detailed testing information, see [TESTING.md](./TESTING.md).

## Build/Test Commands
- `npm run build` - Compile TypeScript to dist/
- `npm run lint` - Run ESLint on src/ files
- `npm test` - Run all tests with Vitest
- `npm run test:unit` - Run only unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ui` - Run tests with UI (Vitest UI)
- `npm run dev` - Run development server with tsx
- `vitest run tests/unit/specific-file.test.ts` - Run a single test file

## Code Style
- ES modules only (type: "module" in package.json)
- Import statements omit file extensions for local files
- Strict TypeScript configuration with all strict flags enabled
- Private class members use `private` keyword and underscore prefix not required
- Error handling: Use try-catch blocks, return error objects, emit events for async errors
- Use camelCase for variables/functions, PascalCase for classes
- Interface definitions inline in tool schemas, separate files for complex types
- Async/await pattern preferred over promises
- Event emitters extend EventEmitter class
- Console.error for logging errors, no other logging framework used

## Testing
- Vitest for all testing (unit and integration)
- Mock child_process and other Node modules with vi.mock()
- Test files in tests/ directory with .test.ts extension
- Use describe/it/expect pattern with beforeEach/afterEach for setup