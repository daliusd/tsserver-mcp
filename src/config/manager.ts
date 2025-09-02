import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getAppDirectories } from './directories.js';
import { AppConfig, defaultConfig } from './types.js';

export class ConfigManager {
  private config: AppConfig = defaultConfig;
  private configPath: string;

  constructor() {
    const dirs = getAppDirectories();
    this.configPath = join(dirs.config, 'config.json');
  }

  async load(): Promise<void> {
    try {
      if (!existsSync(this.configPath)) {
        await this.save(); // Create default config
        return;
      }

      const configData = await readFile(this.configPath, 'utf8');
      const loadedConfig = JSON.parse(configData) as Partial<AppConfig>;
      
      // Merge with defaults to ensure all properties exist
      this.config = {
        debug: {
          ...defaultConfig.debug,
          ...loadedConfig.debug,
        },
      };
    } catch (error) {
      console.error('Failed to load config, using defaults:', error);
      this.config = defaultConfig;
    }
  }

  async save(): Promise<void> {
    try {
      const dirs = getAppDirectories();
      await mkdir(dirs.config, { recursive: true });
      
      await writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf8',
      );
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  get(): AppConfig {
    return this.config;
  }

  getDebugConfig() {
    return this.config.debug;
  }

  async setDebugEnabled(enabled: boolean): Promise<void> {
    this.config.debug.enabled = enabled;
    await this.save();
  }

  async setDebugLevel(level: 'error' | 'warn' | 'info' | 'debug'): Promise<void> {
    this.config.debug.level = level;
    await this.save();
  }

  async setLogToFile(logToFile: boolean): Promise<void> {
    this.config.debug.logToFile = logToFile;
    await this.save();
  }
}

// Singleton instance
let configManager: ConfigManager | null = null;

export function getConfigManager(): ConfigManager {
  if (!configManager) {
    configManager = new ConfigManager();
  }
  return configManager;
}