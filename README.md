# TSServer MCP

A Model Context Protocol (MCP) server that provides TypeScript language features using the TypeScript Language Server (tsserver).

## Features

- **Symbol Navigation**: Go to definition, find references
- **Code Intelligence**: Hover information with type details
- **Diagnostics**: Get syntactic and semantic errors/warnings
- **Refactoring**: Rename symbols, organize imports

## Installation

### From Source

```bash
git clone git@github.com:daliusd/tsserver-mcp.git
cd tsserver-mcp
npm install
npm run build
```

## Usage

### Adding to opencode Config

Add this MCP to your opencode configuration:

#### Using npm package (Recommended)

```json
{
  "mcp": {
    "tsserver-mcp": {
      "type": "local",
      "enabled": true,
      "command": [
        "npx",
        "tsserver-mcp"
      ]
    }
  }
}
```

#### Using local installation

```json
{
  "mcp": {
    "tsserver-mcp": {
      "type": "local",
      "enabled": true,
      "command": [
        "node",
        "/path/to/tsserver-mcp/dist/index.js"
      ]
    }
  }
}
```

## Tools

### `ts_definition`
Get the definition of a symbol at a specific position in a TypeScript file.

**Parameters:**
- `file`: Path to the TypeScript file
- `line`: Line number (1-indexed)
- `offset`: Character offset in the line (1-indexed)

### `ts_hover`
Get type information and documentation for a symbol at a specific position.

**Parameters:**
- `file`: Path to the TypeScript file
- `line`: Line number (1-indexed)
- `offset`: Character offset in the line (1-indexed)

### `ts_references`
Find all references to a symbol at a specific position.

**Parameters:**
- `file`: Path to the TypeScript file
- `line`: Line number (1-indexed)
- `offset`: Character offset in the line (1-indexed)

### `ts_rename`
Get rename information and preview changes for renaming a symbol.

**Parameters:**
- `file`: Path to the TypeScript file
- `line`: Line number (1-indexed)
- `offset`: Character offset in the line (1-indexed)
- `newName`: New name for the symbol

### `ts_diagnostics`
Get syntactic and semantic diagnostics for a TypeScript file.

**Parameters:**
- `file`: Path to the TypeScript file

**Returns:**
- `syntactic`: Array of syntax errors and warnings
- `semantic`: Array of type errors and warnings

Each diagnostic includes:
- `text`: Description of the issue
- `category`: Diagnostic category (error, warning, suggestion, message)
- `code`: TypeScript error code
- `start`: Start position in the file
- `length`: Length of the affected text
- `line`: Line number (when includeLinePosition is true)
- `offset`: Character offset in line (when includeLinePosition is true)

### `ts_organize_imports`
Organize imports in a TypeScript file.

**Parameters:**
- `file`: Path to the TypeScript file

## Requirements

- Node.js 18+
- TypeScript installed globally or in your project

## Publishing

To publish a new version:

```bash
npm version patch|minor|major
npm publish
```

The `prepublishOnly` script will automatically run tests and build the project before publishing.