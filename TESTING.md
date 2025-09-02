# TSServer MCP Testing

This document describes the comprehensive testing setup for the TSServer MCP project.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── tsserver-client.test.ts    # TSServer client tests
│   ├── definition.test.ts         # Definition tool tests
│   ├── hover.test.ts             # Hover tool tests
│   ├── references.test.ts        # References tool tests
│   ├── rename.test.ts            # Rename tool tests
│   └── organizeImports.test.ts   # Organize imports tool tests
├── integration/             # Integration tests
│   └── mcp-server.test.ts        # Full MCP server integration tests
├── fixtures/               # Test fixtures and sample code
│   ├── sample-code.ts            # Basic TypeScript samples
│   ├── api-client.ts             # Complex API client example
│   ├── user-manager.ts           # Cross-file reference examples
│   ├── package.json              # Test project package.json
│   └── tsconfig.json             # Test project TypeScript config
├── mocks.ts                # Mock implementations and test data
├── helpers.ts              # Test utilities and helpers
├── setup.ts                # Test setup and configuration
└── tsconfig.json           # TypeScript config for tests
```

## Test Types

### 1. Unit Tests

**TSServer Client Tests** (`tsserver-client.test.ts`)
- Process management (start/stop)
- Request/response handling
- Error handling and timeouts
- Data parsing and buffering
- Event handling

**Tool Tests** (`definition.test.ts`, `hover.test.ts`, etc.)
- Correct API calls to TSServer
- Response transformation
- Error handling
- File management (open/close)
- Edge cases and null responses

### 2. Integration Tests

**MCP Server Integration** (`mcp-server.test.ts`)
- Real TSServer communication
- End-to-end tool functionality
- Cross-file references
- Performance testing
- Error scenarios with real TypeScript code

### 3. Unit and Integration Tests

**Vitest Test Suite**
- TypeScript compilation verification
- Module import validation
- Unit tests for all MCP tools
- Integration tests with real TSServer
- Performance and error handling tests

## Running Tests

### Run All Tests
```bash
npm test
```
Runs the complete Vitest test suite including:
- Unit tests for all MCP tools
- Integration tests with real TSServer
- TypeScript compilation verification
- Module import validation
- Performance and error handling tests

### Unit Tests Only
```bash
npm run test:unit
```
Runs only the unit tests using Vitest.

### Test Coverage
```bash
npm run test:coverage
```
Generates code coverage reports using Vitest.

### Watch Mode
```bash
npm run test:watch
```
Runs tests in watch mode for development using Vitest.

### Test UI
```bash
npm run test:ui
```
Opens Vitest's interactive test UI in your browser.

## Test Features

### Mock Infrastructure
- **MockTSServerClient**: Simulates TSServer responses
- **Sample TypeScript Code**: Realistic test scenarios
- **Test Utilities**: File management, position finding, response validation

### Test Scenarios Covered

1. **Symbol Navigation**
   - Go to definition for interfaces, classes, functions
   - Find references across files
   - Cross-file symbol resolution

2. **Code Intelligence**
   - Hover information for types, functions, variables
   - Complex type information display
   - Documentation extraction

3. **Refactoring**
   - Symbol renaming with preview
   - Multi-file rename operations
   - Import organization and sorting

4. **Error Handling**
   - Non-existent files
   - Invalid positions
   - Network timeouts
   - TSServer errors

5. **Performance**
   - Multiple concurrent requests
   - Large file handling
   - Response time validation

### Integration Test Features

- **Real TSServer Communication**: Tests actual tsserver process
- **Temporary File Management**: Creates and cleans up test files
- **Cross-file References**: Tests complex project scenarios
- **MCP Protocol Validation**: Ensures proper MCP response formats

## Test Data

### Sample TypeScript Code
- User interface and service class
- Generic functions and types
- Import/export scenarios
- Error-prone code examples

### Mock Responses
- Realistic TSServer response data
- Edge cases and error conditions
- Multi-file scenarios
- Complex type information

## CI/CD Considerations

- Integration tests can be skipped in CI environments without tsserver
- Basic validation tests always run
- Build verification ensures deployability
- Mock tests provide fast feedback

## Development Workflow

1. **Write/modify code**
2. **Run all tests**: `npm test`
3. **Run specific unit tests**: `npm run test:unit`
4. **Check coverage**: `npm run test:coverage`
5. **Use watch mode during development**: `npm run test:watch`
6. **Use test UI for interactive debugging**: `npm run test:ui`

## Troubleshooting

### Vitest Issues
If Vitest has problems:
- Check Node.js version compatibility (>=18.0.0)
- Verify package.json dependencies
- Ensure TypeScript compilation works (`npm run build`)

### TSServer Not Found
If tsserver is not available:
- Install TypeScript globally: `npm install -g typescript`
- Integration tests will be skipped automatically
- Unit tests will still run with mocked TSServer

### Import/Export Issues
If module imports fail:
- Check TypeScript compilation (`npm run build`)
- Verify file paths in test imports
- Ensure proper ES module configuration

This comprehensive test suite ensures the TSServer MCP is reliable, performant, and ready for production use. All tests run efficiently with Vitest, providing fast feedback and excellent developer experience.