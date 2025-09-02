import { homedir, platform } from 'os';
import { join } from 'path';

export interface AppDirectories {
  config: string;
  data: string;
  logs: string;
}

export function getAppDirectories(): AppDirectories {
  const home = homedir();
  const currentPlatform = platform();

  switch (currentPlatform) {
    case 'darwin': {
      const macConfig = join(home, 'Library', 'Application Support', 'tsserver-mcp');
      const macLogs = join(home, 'Library', 'Logs', 'tsserver-mcp');
      return {
        config: macConfig,
        data: macConfig,
        logs: macLogs,
      };
    }

    case 'win32': {
      const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
      const localAppData = process.env.LOCALAPPDATA || join(home, 'AppData', 'Local');
      return {
        config: join(appData, 'tsserver-mcp'),
        data: join(localAppData, 'tsserver-mcp'),
        logs: join(localAppData, 'tsserver-mcp', 'logs'),
      };
    }

    default: {
      const xdgConfigHome = process.env.XDG_CONFIG_HOME || join(home, '.config');
      const xdgDataHome = process.env.XDG_DATA_HOME || join(home, '.local', 'share');
      return {
        config: join(xdgConfigHome, 'tsserver-mcp'),
        data: join(xdgDataHome, 'tsserver-mcp'),
        logs: join(xdgDataHome, 'tsserver-mcp'),
      };
    }
  }
}