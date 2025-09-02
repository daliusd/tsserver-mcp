import { writeFile, mkdir, stat, readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getAppDirectories } from '../config/directories.js';
import { getConfigManager } from '../config/manager.js';
import { DebugConfig } from '../config/types.js';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export class Logger {
  private logDir: string;
  private logFile: string;
  private configManager = getConfigManager();

  constructor() {
    const dirs = getAppDirectories();
    this.logDir = dirs.logs;
    this.logFile = join(this.logDir, 'tsserver-mcp.log');
  }

  private async ensureLogDir(): Promise<void> {
    if (!existsSync(this.logDir)) {
      await mkdir(this.logDir, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const config = this.configManager.getDebugConfig();
    if (!config.enabled) {
      return false;
    }

    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(config.level);
    const messageLevel = levels.indexOf(level);

    return messageLevel <= currentLevelIndex;
  }

  private formatLogEntry(entry: LogEntry): string {
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}\n`;
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    const config = this.configManager.getDebugConfig();
    if (!config.logToFile) {
      return;
    }

    try {
      await this.ensureLogDir();
      await this.rotateLogsIfNeeded(config);
      
      const logLine = this.formatLogEntry(entry);
      await writeFile(this.logFile, logLine, { flag: 'a' });
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private async rotateLogsIfNeeded(config: DebugConfig): Promise<void> {
    try {
      if (!existsSync(this.logFile)) {
        return;
      }

      const stats = await stat(this.logFile);
      const fileSizeInMB = stats.size / (1024 * 1024);

      if (fileSizeInMB > config.maxFileSize) {
        await this.rotateLogs(config.maxFiles);
      }
    } catch (error) {
      console.error('Failed to check log file size:', error);
    }
  }

  private async rotateLogs(maxFiles: number): Promise<void> {
    try {
      // Remove oldest log file if we exceed maxFiles
      const oldestLog = join(this.logDir, `tsserver-mcp.log.${maxFiles - 1}`);
      if (existsSync(oldestLog)) {
        await unlink(oldestLog);
      }

      // Rotate existing log files
      for (let i = maxFiles - 2; i >= 0; i--) {
        const currentLog = i === 0 
          ? this.logFile 
          : join(this.logDir, `tsserver-mcp.log.${i}`);
        const nextLog = join(this.logDir, `tsserver-mcp.log.${i + 1}`);

        if (existsSync(currentLog)) {
          await writeFile(nextLog, await import('fs').then(fs => fs.readFileSync(currentLog)));
          if (i === 0) {
            await writeFile(this.logFile, ''); // Clear current log
          } else {
            await unlink(currentLog);
          }
        }
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    // Fire and forget file writing to avoid blocking operations
    this.writeToFile(entry).catch(error => {
      console.error('Failed to write log entry:', error);
    });

    // Also log to console for development
    const consoleMessage = this.formatLogEntry(entry).trim();
    switch (level) {
      case 'error':
        console.error(consoleMessage);
        break;
      case 'warn':
        console.warn(consoleMessage);
        break;
      case 'info':
        console.log(consoleMessage);
        break;
      case 'debug':
        console.debug(consoleMessage);
        break;
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  async getLogFiles(): Promise<string[]> {
    try {
      if (!existsSync(this.logDir)) {
        return [];
      }

      const files = await readdir(this.logDir);
      return files
        .filter(file => file.startsWith('tsserver-mcp.log'))
        .map(file => join(this.logDir, file))
        .sort();
    } catch (error) {
      console.error('Failed to list log files:', error);
      return [];
    }
  }

  getLogDirectory(): string {
    return this.logDir;
  }
}

// Singleton instance
let logger: Logger | null = null;

export function getLogger(): Logger {
  if (!logger) {
    logger = new Logger();
  }
  return logger;
}