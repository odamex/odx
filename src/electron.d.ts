export interface ElectronAPI {
  platform: NodeJS.Platform;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  restoreWindow: () => void;
  quitApp: () => void;
  flashWindow: () => void;
  updateTrayIcon: (status: 'online' | 'offline' | 'degraded') => void;
  updateTrayTooltip: (tooltip: string) => void;
  updateQueueState: (isMonitoring: boolean) => void;
  showNotification: (title: string, body: string) => void;
  showMessageBox: (options: {
    type?: 'none' | 'info' | 'error' | 'question' | 'warning';
    title?: string;
    message?: string;
    detail?: string;
    buttons?: string[];
    defaultId?: number;
    cancelId?: number;
  }) => Promise<{ response: number; checkboxChecked: boolean }>;
  checkForUpdates: () => void;
  downloadUpdate: () => void;
  quitAndInstall: () => Promise<void>;
  onUpdateChecking: (callback: () => void) => void;
  onUpdateAvailable: (callback: (info: any) => void) => void;
  onUpdateNotAvailable: (callback: (info: any) => void) => void;
  onUpdateError: (callback: (err: any) => void) => void;
  onUpdateDownloadProgress: (callback: (progress: any) => void) => void;
  onUpdateDownloaded: (callback: (info: any) => void) => void;
  onQuickLaunchServer: (callback: () => void) => void;
  onTrayQuickMatch: (callback: () => void) => void;
  onTrayLeaveQueue: (callback: () => void) => void;
  onToggleAutoUpdate: (callback: (enabled: boolean) => void) => void;
  odalPapi: {
    queryMaster: (ip: string) => Promise<Array<{ip: string, port: number}>>;
    queryServer: (serverAddr: {ip: string, port: number}) => Promise<any>;
    pingServer: (serverAddr: {ip: string, port: number}) => Promise<number>;
  };
  fileManager: {
    getInstallationInfo: (customPath?: string) => Promise<{
      installed: boolean;
      version: string | null;
      path: string | null;
      clientPath: string | null;
      serverPath: string | null;
      source: 'odx' | 'system' | 'custom' | 'none';
      systemInstallPath: string | null;
      needsUpdate: boolean;
      latestVersion: string | null;
    }>;
    checkForUpdates: (currentVersion: string | null) => Promise<{ needsUpdate: boolean; latestVersion: string | null }>;
    compareVersions: (v1: string, v2: string) => Promise<number>;
    getLatestRelease: () => Promise<any>;
    getAllReleases: () => Promise<any[]>;
    download: (url: string, filename: string) => Promise<string>;
    extractZip: (zipPath: string) => Promise<void>;
    runInstaller: (installerPath: string, installDir?: string) => Promise<void>;
    findInstallerAsset: (release: any) => Promise<string | null>;
    saveVersion: (version: string) => Promise<void>;
    getDirectories: () => Promise<{odx: string; bin: string; wads: string; config: string}>;
    listWads: () => Promise<string[]>;
    openDirectory: (dirPath: string) => Promise<void>;
    pickDirectory: () => Promise<string | null>;
    getPlatformAsset: () => Promise<string>;
    hasConfiguredInstallation: () => Promise<boolean>;
    saveFirstRunChoice: (source: 'odx' | 'system' | 'custom', customPath?: string) => Promise<void>;
    resetFirstRunConfig: () => Promise<void>;
    launchOdamex: (args: string[]) => Promise<void>;
    onDownloadProgress: (callback: (progress: any) => void) => void;
  };
  iwadManager: {
    detectIWADs: () => Promise<any[]>;
    verifyIWAD: (filePath: string) => Promise<any>;
    getWADDirectories: () => Promise<{directories: string[]; scanSteam: boolean; lastScan?: string}>;
    saveWADDirectories: (config: {directories: string[]; scanSteam: boolean}) => Promise<void>;
    addWADDirectory: (directory: string) => Promise<void>;
    removeWADDirectory: (directory: string) => Promise<void>;
    setSteamScan: (enabled: boolean) => Promise<void>;
    hasWADDirectories: () => Promise<boolean>;
    hasWADConfigFile: () => Promise<boolean>;
    rescanIWADs: (forceRescan?: boolean) => Promise<any[]>;
    getGameMetadata: () => Promise<any>;
    getCacheStats: () => Promise<{
      totalScans: number;
      cacheHits: number;
      cacheMisses: number;
      cachedIWADs: number;
      lastFullScan: string;
      steamPathsCached: number;
      hitRate: string;
    } | null>;
    clearCache: () => Promise<void>;
  };
  getLocalNetworks: () => Promise<Array<{
    name: string;
    address: string;
    netmask: string;
    cidr: string;
  }>>;
  discoverLocalServers: (options: {
    portRangeStart: number;
    portRangeEnd: number;
    scanTimeout: number;
    maxConcurrent: number;
  }) => Promise<Array<{
    address: { ip: string; port: number };
    ping?: number;
    [key: string]: any;
  }>>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
