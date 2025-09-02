import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync } from 'fs';
import { readFile, rmdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { Logger } from '../../src/logger/index.js';

// Mock the directories and config modules
vi.mock('../../src/config/directories.js', () => ({
  getAppDirectories: () => ({
    config: join(tmpdir(), 'tsserver-mcp-test-config'),
    data: join(tmpdir(), 'tsserver-mcp-test-data'),
    logs: join(tmpdir(), 'tsserver-mcp-test-logs'),
  }),
}));

let mockDebugConfig: {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug';
  logToFile: boolean;
  maxFileSize: number;
  maxFiles: number;
} = {
  enabled: true,
  level: 'debug',
  logToFile: true,
  maxFileSize: 1, // Small size for testing rotation
  maxFiles: 3,
};

vi.mock('../../src/config/manager.js', () => ({
  getConfigManager: () => ({
    getDebugConfig: () => mockDebugConfig,
    load: () => Promise.resolve(),
  }),
}));

describe('Logger', () => {
  let logger: Logger;
  let tempLogsDir: string;

  beforeEach(async () => {
    tempLogsDir = join(tmpdir(), 'tsserver-mcp-test-logs');
    logger = new Logger();
    
    // Clean up any existing test directories
    try {
      if (existsSync(tempLogsDir)) {
        await rmdir(tempLogsDir, { recursive: true });
      }
    } catch {
      // Ignore errors
    }

    // Reset mock config
    mockDebugConfig = {
      enabled: true,
      level: 'debug',
      logToFile: true,
      maxFileSize: 1,
      maxFiles: 3,
    };
  });

  afterEach(async () => {
    // Clean up
    try {
      if (existsSync(tempLogsDir)) {
        await rmdir(tempLogsDir, { recursive: true });
      }
    } catch {
      // Ignore errors
    }
  });

  it('should create log directory when it does not exist', async () => {
    expect(existsSync(tempLogsDir)).toBe(false);
    
    logger.info('test message');
    
    // Wait a bit for the async file operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(existsSync(tempLogsDir)).toBe(true);
  });

  it('should write log entries to file', async () => {
    logger.info('test info message');
    logger.error('test error message');
    
    // Wait a bit for the async file operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const logFile = join(tempLogsDir, 'tsserver-mcp.log');
    expect(existsSync(logFile)).toBe(true);
    
    const logContent = await readFile(logFile, 'utf8');
    expect(logContent).toContain('INFO: test info message');
    expect(logContent).toContain('ERROR: test error message');
  });

  it('should include context in log entries', async () => {
    logger.info('test message with context', { key: 'value', number: 42 });
    
    // Wait a bit for the async file operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const logFile = join(tempLogsDir, 'tsserver-mcp.log');
    const logContent = await readFile(logFile, 'utf8');
    
    expect(logContent).toContain('INFO: test message with context');
    expect(logContent).toContain('{"key":"value","number":42}');
  });

  it('should respect log levels', async () => {
    // Update mock config
    mockDebugConfig.level = 'warn';
    
    // Create new logger instance to pick up config changes
    const testLogger = new Logger();
    
    testLogger.debug('debug message');
    testLogger.info('info message');
    testLogger.warn('warn message');
    testLogger.error('error message');
    
    // Wait a bit for the async file operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const logFile = join(tempLogsDir, 'tsserver-mcp.log');
    
    if (existsSync(logFile)) {
      const logContent = await readFile(logFile, 'utf8');
      expect(logContent).not.toContain('debug message');
      expect(logContent).not.toContain('info message');
      expect(logContent).toContain('warn message');
      expect(logContent).toContain('error message');
    }
  });

  it('should not log when debugging is disabled', async () => {
    // Update mock config
    mockDebugConfig.enabled = false;
    
    // Create new logger instance to pick up config changes
    const testLogger = new Logger();
    
    testLogger.error('error message');
    testLogger.info('info message');
    
    // Wait a bit for any potential async file operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const logFile = join(tempLogsDir, 'tsserver-mcp.log');
    expect(existsSync(logFile)).toBe(false);
  });

  it('should not write to file when logToFile is disabled', async () => {
    // Update mock config
    mockDebugConfig.logToFile = false;
    
    // Create new logger instance to pick up config changes
    const testLogger = new Logger();
    
    // Mock console methods to capture output
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    testLogger.info('test message');
    
    // Wait a bit for any potential async file operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const logFile = join(tempLogsDir, 'tsserver-mcp.log');
    expect(existsSync(logFile)).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('INFO: test message')
    );
    
    consoleSpy.mockRestore();
  });

  it('should return correct log directory', () => {
    expect(logger.getLogDirectory()).toBe(tempLogsDir);
  });

  it('should list log files', async () => {
    logger.info('test message 1');
    logger.info('test message 2');
    
    // Wait a bit for the async file operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const logFiles = await logger.getLogFiles();
    expect(logFiles).toHaveLength(1);
    expect(logFiles[0]).toBe(join(tempLogsDir, 'tsserver-mcp.log'));
  });

  it('should format timestamps correctly', async () => {
    logger.info('test message');
    
    // Wait a bit for the async file operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const logFile = join(tempLogsDir, 'tsserver-mcp.log');
    const logContent = await readFile(logFile, 'utf8');
    
    // Check that the log contains an ISO timestamp
    const timestampRegex = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/;
    expect(logContent).toMatch(timestampRegex);
  });
});