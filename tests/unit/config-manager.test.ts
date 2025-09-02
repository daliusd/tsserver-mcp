import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync } from 'fs';
import { mkdir, rmdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { ConfigManager } from '../../src/config/manager.js';
import { defaultConfig } from '../../src/config/types.js';

// Mock the directories module to use temp directory
vi.mock('../../src/config/directories.js', () => ({
  getAppDirectories: () => ({
    config: join(tmpdir(), 'tsserver-mcp-test-config'),
    data: join(tmpdir(), 'tsserver-mcp-test-data'),
    logs: join(tmpdir(), 'tsserver-mcp-test-logs'),
  }),
}));

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let tempConfigDir: string;

  beforeEach(async () => {
    tempConfigDir = join(tmpdir(), 'tsserver-mcp-test-config');
    configManager = new ConfigManager();
    
    // Clean up any existing test directories
    try {
      if (existsSync(tempConfigDir)) {
        await rmdir(tempConfigDir, { recursive: true });
      }
    } catch {
      // Ignore errors
    }
  });

  afterEach(async () => {
    // Clean up
    try {
      if (existsSync(tempConfigDir)) {
        await rmdir(tempConfigDir, { recursive: true });
      }
    } catch {
      // Ignore errors
    }
  });

  it('should load default config when no config file exists', async () => {
    await configManager.load();
    const config = configManager.get();
    
    expect(config).toEqual(defaultConfig);
    expect(config.debug.enabled).toBe(false);
    expect(config.debug.level).toBe('info');
  });

  it('should create config file with defaults when none exists', async () => {
    await configManager.load();
    
    const configPath = join(tempConfigDir, 'config.json');
    expect(existsSync(configPath)).toBe(true);
  });

  it('should load existing config file', async () => {
    // Create config directory and file
    await mkdir(tempConfigDir, { recursive: true });
    const configPath = join(tempConfigDir, 'config.json');
    const testConfig = {
      debug: {
        enabled: true,
        level: 'debug' as const,
        logToFile: false,
        maxFileSize: 5,
        maxFiles: 3,
      },
    };
    
    await writeFile(configPath, JSON.stringify(testConfig, null, 2));
    
    await configManager.load();
    const config = configManager.get();
    
    expect(config.debug.enabled).toBe(true);
    expect(config.debug.level).toBe('debug');
    expect(config.debug.logToFile).toBe(false);
    expect(config.debug.maxFileSize).toBe(5);
    expect(config.debug.maxFiles).toBe(3);
  });

  it('should merge partial config with defaults', async () => {
    // Create config directory and file with only some properties
    await mkdir(tempConfigDir, { recursive: true });
    const configPath = join(tempConfigDir, 'config.json');
    const partialConfig = {
      debug: {
        enabled: true,
        level: 'debug' as const,
      },
    };
    
    await writeFile(configPath, JSON.stringify(partialConfig, null, 2));
    
    await configManager.load();
    const config = configManager.get();
    
    expect(config.debug.enabled).toBe(true);
    expect(config.debug.level).toBe('debug');
    expect(config.debug.logToFile).toBe(defaultConfig.debug.logToFile);
    expect(config.debug.maxFileSize).toBe(defaultConfig.debug.maxFileSize);
    expect(config.debug.maxFiles).toBe(defaultConfig.debug.maxFiles);
  });

  it('should handle invalid config file gracefully', async () => {
    // Create config directory and invalid JSON file
    await mkdir(tempConfigDir, { recursive: true });
    const configPath = join(tempConfigDir, 'config.json');
    await writeFile(configPath, 'invalid json content');
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    await configManager.load();
    const config = configManager.get();
    
    expect(config).toEqual(defaultConfig);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load config'),
      expect.any(Error)
    );
    
    consoleSpy.mockRestore();
  });

  it('should update debug enabled setting', async () => {
    await configManager.load();
    
    await configManager.setDebugEnabled(true);
    expect(configManager.getDebugConfig().enabled).toBe(true);
    
    await configManager.setDebugEnabled(false);
    expect(configManager.getDebugConfig().enabled).toBe(false);
  });

  it('should update debug level setting', async () => {
    await configManager.load();
    
    await configManager.setDebugLevel('debug');
    expect(configManager.getDebugConfig().level).toBe('debug');
    
    await configManager.setDebugLevel('error');
    expect(configManager.getDebugConfig().level).toBe('error');
  });

  it('should update log to file setting', async () => {
    await configManager.load();
    
    await configManager.setLogToFile(false);
    expect(configManager.getDebugConfig().logToFile).toBe(false);
    
    await configManager.setLogToFile(true);
    expect(configManager.getDebugConfig().logToFile).toBe(true);
  });
});