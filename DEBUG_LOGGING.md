# Debug Logging Configuration

TSServer MCP now supports configurable debug logging that can be turned on/off via configuration files. Debug logs are written to OS-specific directories and can help troubleshoot issues with TypeScript language server operations.

## Configuration

### Configuration File Location

The configuration file is located at:

- **Linux/Unix**: `~/.config/tsserver-mcp/config.json`
- **macOS**: `~/Library/Application Support/tsserver-mcp/config.json`
- **Windows**: `%APPDATA%/tsserver-mcp/config.json`

### Configuration Schema

```json
{
  "debug": {
    "enabled": true,
    "level": "debug",
    "logToFile": true,
    "maxFileSize": 10,
    "maxFiles": 5
  }
}
```

#### Configuration Options

- **`enabled`** (boolean): Enable or disable debug logging. Default: `false`
- **`level`** (string): Minimum log level to output. Options: `"error"`, `"warn"`, `"info"`, `"debug"`. Default: `"info"`
- **`logToFile`** (boolean): Whether to write logs to file. Default: `true`
- **`maxFileSize`** (number): Maximum log file size in MB before rotation. Default: `10`
- **`maxFiles`** (number): Number of rotated log files to keep. Default: `5`

## Log File Location

Debug logs are written to:

- **Linux/Unix**: `~/.local/share/tsserver-mcp/tsserver-mcp.log`
- **macOS**: `~/Library/Logs/tsserver-mcp/tsserver-mcp.log`
- **Windows**: `%LOCALAPPDATA%/tsserver-mcp/logs/tsserver-mcp.log`

## Log Rotation

When the log file exceeds the configured `maxFileSize`, it will be rotated:
- Current log becomes `tsserver-mcp.log.0`
- Previous `tsserver-mcp.log.0` becomes `tsserver-mcp.log.1`
- And so on...
- Files beyond `maxFiles` are deleted

## Example Usage

### Enable Debug Logging

1. Create the configuration file at the appropriate location for your OS
2. Set the content to enable debug logging:

```json
{
  "debug": {
    "enabled": true,
    "level": "debug",
    "logToFile": true,
    "maxFileSize": 10,
    "maxFiles": 5
  }
}
```

3. Restart TSServer MCP

### View Logs

Debug logs will contain information about:
- TSServer process lifecycle (start, stop, errors)
- File operations (open, close)
- Tool invocations (definition, hover, references, etc.)
- Request/response details
- Error conditions and retry attempts

### Disable Debug Logging

To disable debug logging, either:
1. Set `"enabled": false` in the config file, or
2. Delete the configuration file (defaults to disabled)

## Log Levels

The logging system respects the configured log level:

- **`error`**: Only error messages
- **`warn`**: Warning and error messages
- **`info`**: Informational, warning, and error messages
- **`debug`**: All messages including detailed debug information

## Performance Considerations

- Debug logging adds minimal overhead when disabled
- When enabled with `debug` level, logs can be verbose for high-frequency operations
- Consider using `info` or `warn` levels for production environments
- Log rotation prevents unlimited disk usage

## Troubleshooting

If logging is not working as expected:

1. Verify the configuration file exists and has valid JSON
2. Check directory permissions for the config and log directories
3. Ensure TSServer MCP has been restarted after configuration changes
4. Look for error messages in the console output during startup