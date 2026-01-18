// @ts-nocheck
// Preload script for Electron - exposes safe IPC methods to renderer
import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  // Platform info
  platform: process.platform,
  githubToken: process.env.ODX_GITHUB_TOKEN || '',
  getAppPath: () => ipcRenderer.invoke('app:getPath'),
  setQuitOnClose: (enabled: boolean) => ipcRenderer.invoke('app:setQuitOnClose', enabled),
  openLogDirectory: () => ipcRenderer.invoke('app:open-log-directory'),
  getLogPath: () => ipcRenderer.invoke('app:get-log-path'),
  isHardwareAccelerationEnabled: () => ipcRenderer.invoke('app:is-hardware-acceleration-enabled'),

  // Clipboard (moved from renderer for Electron 40 compatibility)
  clipboard: {
    writeText: (text: string) => ipcRenderer.invoke('clipboard:write-text', text),
  },

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  restoreWindow: () => ipcRenderer.send('window-restore'),
  quitApp: () => ipcRenderer.send('app-quit'),
  flashWindow: () => ipcRenderer.send('flash-window'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  updateTrayIcon: (status: 'online' | 'offline' | 'degraded') => ipcRenderer.send('update-tray-icon', status),
  updateTrayTooltip: (tooltip: string) => ipcRenderer.send('update-tray-tooltip', tooltip),
  updateQueueState: (isMonitoring: boolean) => ipcRenderer.send('update-queue-state', isMonitoring),
  showNotification: (title: string, body: string, serverId?: string) => ipcRenderer.send('show-notification', title, body, serverId),
  updateNotificationSettings: (queueLimit: number, idleThresholdMinutes: number) => 
    ipcRenderer.send('update-notification-settings', queueLimit, idleThresholdMinutes),
  showMessageBox: (options: any) => ipcRenderer.invoke('show-message-box', options),
  onNotificationClick: (callback: (serverId?: string) => void) => ipcRenderer.on('notification-click', (_event, serverId) => callback(serverId)),
  onNotificationAction: (callback: (action: string, serverId?: string) => void) => ipcRenderer.on('notification-action', (_event, action, serverId) => callback(action, serverId)),

  // Updates
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateChecking: (callback: () => void) => ipcRenderer.on('update-checking', callback),
  onUpdateAvailable: (callback: (info: any) => void) => ipcRenderer.on('update-available', (_event, info) => callback(info)),
  onUpdateNotAvailable: (callback: (info: any) => void) => ipcRenderer.on('update-not-available', (_event, info) => callback(info)),
  onUpdateError: (callback: (err: any) => void) => ipcRenderer.on('update-error', (_event, err) => callback(err)),
  onUpdateDownloadProgress: (callback: (progress: any) => void) => ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress)),
  onUpdateDownloaded: (callback: (info: any) => void) => ipcRenderer.on('update-downloaded', (_event, info) => callback(info)),

  // Tray actions
  onQuickLaunchServer: (callback: () => void) => ipcRenderer.on('quick-launch-server', callback),
  onTrayQuickMatch: (callback: () => void) => ipcRenderer.on('tray-quick-match', callback),
  onTrayLeaveQueue: (callback: () => void) => ipcRenderer.on('tray-leave-queue', callback),
  onToggleAutoUpdate: (callback: (enabled: boolean) => void) => ipcRenderer.on('toggle-auto-update', (_event, enabled) => callback(enabled)),

  // OdalPapi methods
  odalPapi: {
    queryMaster: (ip: string) => ipcRenderer.invoke('odalpapi:query-master', ip),
    queryServer: (serverAddr: {ip: string, port: number}) => ipcRenderer.invoke('odalpapi:query-server', serverAddr),
    pingServer: (serverAddr: {ip: string, port: number}) => ipcRenderer.invoke('odalpapi:ping-server', serverAddr)
  },

  // File Manager methods
  fileManager: {
    getInstallationInfo: (customPath?: string) => ipcRenderer.invoke('file:get-installation-info', customPath),
    compareVersions: (v1: string, v2: string) => ipcRenderer.invoke('file:compare-versions', v1, v2),
    download: (url: string, filename: string) => ipcRenderer.invoke('file:download', url, filename),
    extractZip: (zipPath: string) => ipcRenderer.invoke('file:extract-zip', zipPath),
    runInstaller: (installerPath: string, installDir?: string) => ipcRenderer.invoke('file:run-installer', installerPath, installDir),
    installFlatpak: (flatpakPath: string) => ipcRenderer.invoke('file:install-flatpak', flatpakPath),
    findInstallerAsset: (release: any) => ipcRenderer.invoke('file:find-installer-asset', release),
    saveVersion: (version: string) => ipcRenderer.invoke('file:save-version', version),
    getDirectories: () => ipcRenderer.invoke('file:get-directories'),
    listWads: () => ipcRenderer.invoke('file:list-wads'),
    openDirectory: (dirPath: string) => ipcRenderer.invoke('file:open-directory', dirPath),
    pickDirectory: () => ipcRenderer.invoke('file:pick-directory'),
    getPlatformAsset: () => ipcRenderer.invoke('file:get-platform-asset'),
    hasConfiguredInstallation: () => ipcRenderer.invoke('file:has-configured'),
    saveFirstRunChoice: (source: 'odx' | 'system' | 'custom', customPath?: string) => ipcRenderer.invoke('file:save-first-run', source, customPath),
    resetFirstRunConfig: () => ipcRenderer.invoke('file:reset-first-run'),
    launchOdamex: (args: string[]) => ipcRenderer.invoke('file:launch-odamex', args),
    onDownloadProgress: (callback: (progress: any) => void) => ipcRenderer.on('file:download-progress', (_event, progress) => callback(progress))
  },

  // IWAD Manager methods
  iwadManager: {
    detectIWADs: () => ipcRenderer.invoke('iwad:detect'),
    verifyIWAD: (filePath: string) => ipcRenderer.invoke('iwad:verify', filePath),
    getWADDirectories: () => ipcRenderer.invoke('iwad:get-directories'),
    saveWADDirectories: (config: any) => ipcRenderer.invoke('iwad:save-directories', config),
    addWADDirectory: (directory: string) => ipcRenderer.invoke('iwad:add-directory', directory),
    removeWADDirectory: (directory: string) => ipcRenderer.invoke('iwad:remove-directory', directory),
    setSteamScan: (enabled: boolean) => ipcRenderer.invoke('iwad:set-steam-scan', enabled),
    toggleRecursiveScan: (directoryPath: string, recursive: boolean) => ipcRenderer.invoke('iwad:toggle-recursive-scan', directoryPath, recursive),
    hasWADDirectories: () => ipcRenderer.invoke('iwad:has-directories'),
    hasWADConfigFile: () => ipcRenderer.invoke('iwad:has-config-file'),
    rescanIWADs: (forceRescan?: boolean) => ipcRenderer.invoke('iwad:rescan', forceRescan),
    getGameMetadata: () => ipcRenderer.invoke('iwad:get-metadata'),
    getCacheStats: () => ipcRenderer.invoke('iwad:get-cache-stats'),
    clearCache: () => ipcRenderer.invoke('iwad:clear-cache')
  },

  // Network Discovery methods
  getLocalNetworks: () => ipcRenderer.invoke('network-discovery:get-networks'),
  discoverLocalServers: (options: {
    portRangeStart: number;
    portRangeEnd: number;
    scanTimeout: number;
    maxConcurrent: number;
  }, networks?: any[]) => ipcRenderer.invoke('network-discovery:scan', options, networks)
});
