export interface DebugConfig {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug';
  logToFile: boolean;
  maxFileSize: number; // in MB
  maxFiles: number; // number of rotated log files to keep
}

export interface AppConfig {
  debug: DebugConfig;
}

export const defaultConfig: AppConfig = {
  debug: {
    enabled: false,
    level: 'info',
    logToFile: true,
    maxFileSize: 10, // 10MB
    maxFiles: 5,
  },
};