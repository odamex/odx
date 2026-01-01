// @ts-nocheck
import { app, BrowserWindow, ipcMain, Menu, Tray, screen, nativeTheme, dialog, nativeImage, powerMonitor, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as url from 'url';
import * as dotenv from 'dotenv';
import { OdalPapiMainService } from './odalpapi-main';
import { FileManagerService } from './file-manager-main';
import { IWADManager } from './iwad-manager';
import { registerNetworkDiscoveryHandlers } from './network-discovery-main';
import * as fs from 'fs';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const isDevelopment = process.argv.includes('--serve');

// Configure auto-updater
autoUpdater.autoDownload = false; // Manual download control
autoUpdater.autoInstallOnAppQuit = true; // Install when app quits
if (!isDevelopment) {
  autoUpdater.allowPrerelease = false;
}

// Configure logging - use electron-log in both dev and production
const electronLog = require('electron-log');
const log = electronLog.default || electronLog;
log.transports.file.level = 'info';
log.transports.console.level = isDevelopment ? 'debug' : 'info';

// Log file locations for reference:
// Windows: %USERPROFILE%\AppData\Roaming\odx-launcher\logs\main.log
// macOS: ~/Library/Logs/odx-launcher/main.log
// Linux: ~/.config/odx-launcher/logs/main.log
log.info('='.repeat(80));
log.info('ODX Launcher starting...');
log.info('Mode:', isDevelopment ? 'Development' : 'Production');
log.info('Packaged:', app.isPackaged);
log.info('Log file location:', log.transports.file.getFile().path);
log.info('='.repeat(80));

if (!isDevelopment) {
  autoUpdater.logger = log;
}

// Notification queue for idle/locked periods
interface QueuedNotification {
  title: string;
  body: string;
  timestamp: number;
  serverId?: string;
}

let isSystemLocked = false;
let notificationQueue: QueuedNotification[] = [];
let maxQueuedNotifications = 50;
let idleThresholdMinutes = 0;
let idleCheckInterval: NodeJS.Timeout | null = null;

// Register IPC handlers early
registerNetworkDiscoveryHandlers();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let quitOnClose = false; // Setting for quit on close behavior
let isMonitoringQueue = false; // Track queue monitoring state
const odalPapiService = new OdalPapiMainService();
const fileManager = new FileManagerService();
const iwadManager = new IWADManager(
  fileManager.getWadsDirectory(),
  fileManager.getConfigDirectory()
);

const baseWidth = 1200;
const baseHeight = 800;

/**
 * Get the appropriate app icon based on platform and environment
 * In production, Windows uses the .ico file from build resources
 * In development, all platforms use the PNG
 */
function getAppIcon(): string {
  if (isDevelopment) {
    return path.join(__dirname, '../public/favicon.256x256.png');
  }
  
  // In production builds
  if (process.platform === 'win32') {
    // Windows: Use PNG from dist folder, .ico is embedded in the exe
    return path.join(__dirname, '../public/favicon.256x256.png');
  } else if (process.platform === 'darwin') {
    // macOS: .icns is handled by electron-builder automatically
    return path.join(__dirname, '../public/favicon.512x512.png');
  } else {
    // Linux: use high-res PNG
    return path.join(__dirname, '../public/favicon.512x512.png');
  }
}

function createWindow(): void {
  const electronScreen = screen;
  const primaryDisplay = electronScreen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the browser window with platform-specific frame settings
  mainWindow = new BrowserWindow({
    x: Math.floor((width - baseWidth) / 2),
    y: Math.floor((height - baseHeight) / 2),
    width: baseWidth,
    height: baseHeight,
    minWidth: 960,
    minHeight: 600,
    frame: process.platform === 'darwin', // Native frame on macOS, custom on Windows/Linux
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined, // macOS hidden title bar with traffic lights
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 12 } : undefined,
    transparent: false,
    backgroundColor: '#2c2c2c',
    title: 'ODX',
    icon: getAppIcon(),
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
    }
  });

  // Set dark theme
  nativeTheme.themeSource = 'dark';

  // Disable default menu in production to prevent F12/DevTools shortcuts
  if (!isDevelopment) {
    Menu.setApplicationMenu(null);
  }

  // Load the app
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:4200').catch(err => {
      console.error('Failed to load dev URL:', err);
    });
    mainWindow.webContents.openDevTools();
  } else {
    // In production, dist is packaged inside app.asar
    const indexPath = path.join(__dirname, '../dist/browser/index.html');
    mainWindow.loadURL(
      url.format({
        pathname: indexPath,
        protocol: 'file:',
        slashes: true
      })
    ).catch(err => {
      console.error('Failed to load production URL:', err);
      console.error('Attempted path:', indexPath);
    });
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow?.show();
  });

  // Log any loading failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Handle close button - minimize to tray or quit based on user preference
  mainWindow.on('close', async (event) => {
    if (!isQuitting && !quitOnClose) {
      // Minimize to tray
      event.preventDefault();
      mainWindow?.hide();
      return false;
    }
    
    if (!isQuitting && quitOnClose) {
      // Show confirmation dialog when quit on close is enabled
      event.preventDefault();
      
      const response = await dialog.showMessageBox(mainWindow!, {
        type: 'question',
        buttons: ['Quit', 'Cancel'],
        defaultId: 0,
        title: 'Quit ODX',
        message: 'Are you sure you want to quit?',
        detail: 'This will close the application completely.'
      });
      
      if (response.response === 0) {
        // User clicked Quit
        isQuitting = true;
        app.quit();
      }
      return false;
    }
    
    return true;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Window flash on focus (for respawn notifications, etc.)
  mainWindow.on('focus', () => {
    mainWindow?.flashFrame(false);
  });
}

function createTray(): void {
  const trayIconPath = isDevelopment 
    ? path.join(__dirname, '../build/trayicon.png')
    : path.join(process.resourcesPath, 'trayicon.png');
  tray = new Tray(trayIconPath);

  updateTrayMenu();

  tray.setToolTip('ODX');

  tray.on('click', () => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

/**
 * Update the tray context menu
 * Rebuilds the menu to reflect current state (e.g., queue monitoring)
 */
function updateTrayMenu(): void {
  if (!tray) return;

  const menuTemplate: any[] = [
    {
      label: 'Show ODX',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      }
    },
    { type: 'separator' },
    {
      label: 'Quick Match',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.webContents.send('tray-quick-match');
      }
    }
  ];

  // Add "Leave Queue" option if monitoring is active
  if (isMonitoringQueue) {
    menuTemplate.push({
      label: 'Stop Match Monitoring',
      click: () => {
        mainWindow?.webContents.send('tray-leave-queue');
      }
    });
  }

  menuTemplate.push(
    {
      label: 'Auto-Update',
      type: 'checkbox',
      checked: true,
      click: (menuItem) => {
        mainWindow?.webContents.send('toggle-auto-update', menuItem.checked);
      }
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  );

  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setContextMenu(contextMenu);
}

// IPC Handlers for window controls
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.on('window-restore', () => {
  mainWindow?.show();
  mainWindow?.focus();
});

ipcMain.on('app-quit', () => {
  isQuitting = true;
  app.quit();
});

// Flash window for notifications
ipcMain.on('flash-window', () => {
  if (!mainWindow?.isFocused()) {
    mainWindow?.flashFrame(true);
  }
});

// Open external URL in default browser
ipcMain.handle('open-external', async (_event, url: string) => {
  try {
    await shell.openExternal(url);
  } catch (err) {
    console.error('[Main] Failed to open external URL:', err);
    throw err;
  }
});

// Update queue monitoring state for tray menu
ipcMain.on('update-queue-state', (_event, isMonitoring: boolean) => {
  isMonitoringQueue = isMonitoring;
  updateTrayMenu();
});

// Update tray tooltip
ipcMain.on('update-tray-tooltip', (_event, tooltip: string) => {
  if (tray) {
    tray.setToolTip(tooltip);
  }
});

// Update overlay icon based on connection status
ipcMain.on('update-tray-icon', (_event, status: 'online' | 'offline' | 'degraded') => {
  if (!mainWindow || process.platform !== 'win32') {
    return; // Overlay icons only work on Windows
  }

  try {
    if (status === 'offline') {
      mainWindow.setOverlayIcon(null, '');
    } else {
      // Load PNG file (try both PNG and ICO)
      const possibleNames = [`overlay-${status}.png`, `overlay-${status}.ico`];
      const basePaths = [
        isDevelopment ? path.join(__dirname, '../build/overlay-icons') : path.join(process.resourcesPath, 'overlay-icons'),
        path.join(process.cwd(), 'build', 'overlay-icons'),
        path.join(__dirname, '..', 'build', 'overlay-icons')
      ];
      
      let overlayPath = null;
      for (const basePath of basePaths) {
        for (const name of possibleNames) {
          const testPath = path.join(basePath, name);
          if (fs.existsSync(testPath)) {
            overlayPath = testPath;
            break;
          }
        }
        if (overlayPath) break;
      }
      
      if (overlayPath) {
        const image = nativeImage.createFromPath(overlayPath);
        if (!image.isEmpty()) {
          mainWindow.setOverlayIcon(image, status);
        }
      }
    }
  } catch (err) {
    console.error('[Main] ERROR setting overlay icon:', err);
  }
});

// Update tray tooltip
ipcMain.on('update-tray-tooltip', (_event, tooltip: string) => {
  if (tray) {
    tray.setToolTip(tooltip);
  }
});

// Show system notification
ipcMain.on('show-notification', (_event, title: string, body: string, serverId?: string) => {
  // If system is locked or idle, queue the notification instead of showing it
  if (isSystemLocked) {
    // Add to queue with limit
    const limit = maxQueuedNotifications === 0 ? Infinity : maxQueuedNotifications;
    if (notificationQueue.length < limit) {
      notificationQueue.push({
        title,
        body,
        timestamp: Date.now(),
        serverId
      });
      console.log(`[Notifications] Queued notification while locked/idle (${notificationQueue.length} in queue)`);
    } else {
      console.log('[Notifications] Queue full, dropping notification');
    }
    return;
  }

  // Show notification immediately if not locked
  showSystemNotification(title, body, serverId);
});

/**
 * Update notification settings from renderer
 */
ipcMain.on('update-notification-settings', (_event, queueLimit: number, idleThreshold: number) => {
  maxQueuedNotifications = queueLimit;
  idleThresholdMinutes = idleThreshold;
  
  console.log('[Notifications] Settings updated:', {
    queueLimit: queueLimit === 0 ? 'unlimited' : queueLimit,
    idleThresholdMinutes: idleThreshold
  });
  
  // Set up or clear idle checking based on threshold
  setupIdleChecking();
});

/**
 * Generates Windows Toast XML with action buttons
 */
function generateWindowsToastXml(title: string, body: string, serverId: string): string {
  // Escape XML special characters
  const escapeXml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };
  
  const escapedTitle = escapeXml(title);
  const escapedBody = escapeXml(body);
  const escapedServerId = escapeXml(serverId);
  
  return `
    <toast launch="action=open&amp;serverId=${escapedServerId}">
      <visual>
        <binding template="ToastGeneric">
          <text>${escapedTitle}</text>
          <text>${escapedBody}</text>
        </binding>
      </visual>
      <actions>
        <action content="Join Server" arguments="action=join&amp;serverId=${escapedServerId}" activationType="foreground"/>
        <action content="View Servers" arguments="action=open&amp;serverId=${escapedServerId}" activationType="foreground"/>
      </actions>
    </toast>
  `.trim();
}

/**
 * Shows a system notification immediately
 */
function showSystemNotification(title: string, body: string, serverId?: string) {
  log.info('[Notification] Attempting to show notification:', { title, body, serverId, platform: process.platform });
  log.info('[Notification] App state - isPackaged:', app.isPackaged, 'isDevelopment:', isDevelopment);
  
  const { Notification } = require('electron');
  
  if (!Notification.isSupported()) {
    log.error('[Notification] Notifications are not supported on this system');
    return;
  }
  
  log.info('[Notification] Notifications are supported');
  
  // For Windows Toast XML, don't specify an icon - Windows uses the app icon from the exe
  // For other platforms or basic notifications, try to use an icon from public folder
  let iconPath: string | undefined;
  
  if (process.platform !== 'win32' || !serverId) {
    // Only use icon for non-Windows or basic notifications
    if (app.isPackaged) {
      // In packaged builds, use favicon from public folder (gets included in resources)
      iconPath = path.join(process.resourcesPath, 'app.asar', 'dist', 'browser', 'favicon.256x256.png');
    } else {
      // In development, use from public folder
      iconPath = path.join(__dirname, '..', 'public', 'favicon.256x256.png');
    }
    log.info('[Notification] Icon path:', iconPath, 'exists:', require('fs').existsSync(iconPath));
  } else {
    log.info('[Notification] Using app icon from exe for Toast notification (no explicit icon needed)');
  }
  
  const notificationOptions: any = {
    title,
    body
  };
  
  // Only add icon if we determined one
  if (iconPath) {
    notificationOptions.icon = iconPath;
  }
  
  // Platform-specific handling for action buttons
  if (serverId) {
    log.info('[Notification] Adding action buttons for serverId:', serverId);
    if (process.platform === 'win32') {
      // Windows: Toast XML with action buttons requires code signing
      // For now, use basic notification with helpful text
      // TODO: Implement Toast XML when app is code-signed for release
      log.info('[Notification] Using basic notification (Toast XML requires code signing)');
      notificationOptions.body = `${body}\n\nClick to view in server browser`;
    } else if (process.platform === 'darwin') {
      // macOS: Use actions API
      notificationOptions.actions = [{
        type: 'button',
        text: 'Join Server'
      }];
      log.info('[Notification] Added macOS action button');
    }
    // Linux doesn't support action buttons in Electron notifications
  }
  
  try {
    log.info('[Notification] Creating notification with options:', JSON.stringify(notificationOptions, null, 2));
    const notification = new Notification(notificationOptions);
    
    log.info('[Notification] Notification created, calling show()');
    
    // Add event listeners BEFORE calling show()
    notification.on('show', () => {
      log.info('[Notification] ✓ Notification SHOW event fired - notification is visible to user');
    });
    
    notification.on('close', () => {
      log.info('[Notification] Notification CLOSE event fired');
    });
    
    notification.on('failed', (event, error) => {
      log.error('[Notification] ✗ FAILED event fired:', error);
    });
    
    notification.show();
    log.info('[Notification] show() called successfully');
    
    // On Windows, check if we need to log additional info
    if (process.platform === 'win32') {
      log.info('[Notification] Windows Info:');
      log.info('  - App Name:', app.name);
      log.info('  - App User Model ID:', app.getAppUserModelId());
      log.info('  ℹ️ Note: Toast XML with action buttons requires code signing');
      log.info('  ℹ️ Click notification to open server browser');
      log.info('  ℹ️ Check Windows Settings > System > Notifications');
      log.info('  ℹ️ Check if Focus Assist (Do Not Disturb) is enabled');
      log.info('  ℹ️ Check Action Center (Windows key + N) for the notification');
    }
    
    // Handle notification click - open server browser
    notification.on('click', () => {
      log.info('[Notification] Notification clicked');
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        // Send event to renderer to navigate to servers page
        mainWindow.webContents.send('notification-click', serverId);
      }
    });
    
    // Handle action button click - macOS only
    notification.on('action', (event, index) => {
      log.info('[Notification] Action button clicked, index:', index);
      if (index === 0 && serverId) {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          // Send event to renderer to join the server
          mainWindow.webContents.send('notification-action', 'join-server', serverId);
        }
      }
    });
  } catch (error) {
    console.error('[Notification] Error creating/showing notification:', error);
  }
}

/**
 * Shows a summary notification for queued notifications
 */
function showQueuedNotificationsSummary() {
  if (notificationQueue.length === 0) {
    return;
  }

  console.log(`[Notifications] Showing summary of ${notificationQueue.length} queued notifications`);

  // Count notifications by type
  const serverActivityCount = notificationQueue.filter(n => 
    n.title.includes('Server Activity') || n.body.includes('joined') || n.body.includes('left')
  ).length;

  const otherCount = notificationQueue.length - serverActivityCount;

  // Build summary message
  let summaryBody = '';
  if (serverActivityCount > 0) {
    summaryBody += `${serverActivityCount} server activity notification${serverActivityCount > 1 ? 's' : ''}`;
  }
  if (otherCount > 0) {
    if (summaryBody) summaryBody += '\n';
    summaryBody += `${otherCount} other notification${otherCount > 1 ? 's' : ''}`;
  }

  // Show single summary notification
  showSystemNotification(
    `${notificationQueue.length} Notification${notificationQueue.length > 1 ? 's' : ''} While Away`,
    summaryBody
  );

  // Clear the queue
  notificationQueue = [];
}

/**
 * Set up idle checking based on threshold setting
 */
function setupIdleChecking() {
  // Clear existing interval if any
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
  }
  
  // If threshold is 0, only use lock/sleep detection (no idle checking)
  if (idleThresholdMinutes === 0) {
    console.log('[Notifications] Idle detection disabled, using only lock/sleep events');
    return;
  }
  
  console.log(`[Notifications] Idle detection enabled: ${idleThresholdMinutes} minutes`);
  
  // Check idle state every 30 seconds
  idleCheckInterval = setInterval(() => {
    const idleTimeSeconds = powerMonitor.getSystemIdleTime();
    const idleTimeMinutes = Math.floor(idleTimeSeconds / 60);
    const wasLocked = isSystemLocked;
    
    // Mark as locked if idle time exceeds threshold
    if (idleTimeMinutes >= idleThresholdMinutes) {
      if (!isSystemLocked) {
        console.log(`[Notifications] System idle for ${idleTimeMinutes} minutes - queuing notifications`);
        isSystemLocked = true;
      }
    } else {
      if (isSystemLocked && wasLocked) {
        // User became active again after being idle
        console.log('[Notifications] System active again - showing queued notifications');
        isSystemLocked = false;
        showQueuedNotificationsSummary();
      }
    }
  }, 30000); // Check every 30 seconds
}

// Show message box dialog
ipcMain.handle('show-message-box', async (_event, options: any) => {
  const { dialog } = require('electron');
  if (mainWindow) {
    return await dialog.showMessageBox(mainWindow, options);
  }
  return await dialog.showMessageBox(options);
});

// Get app path
ipcMain.handle('app:getPath', () => {
  return app.getAppPath();
});

ipcMain.handle('app:setQuitOnClose', (_event, enabled: boolean) => {
  quitOnClose = enabled;
});

// Check for updates
ipcMain.on('check-for-updates', () => {
  if (!isDevelopment) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// Download update
ipcMain.on('download-update', () => {
  if (!isDevelopment) {
    autoUpdater.downloadUpdate();
  }
});

// Install update and restart
ipcMain.handle('quit-and-install', async () => {
  if (!isDevelopment) {
    isQuitting = true;
    // Force immediate restart and launch app after update
    setImmediate(() => autoUpdater.quitAndInstall(true, true));
  }
});

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  mainWindow?.webContents.send('update-checking');
});

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  mainWindow?.webContents.send('update-not-available', info);
});

autoUpdater.on('error', (err) => {
  mainWindow?.webContents.send('update-error', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  mainWindow?.webContents.send('update-download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('update-downloaded', info);
});

// App lifecycle
app.on('ready', () => {
  // Set app name for Linux WM_CLASS
  if (process.platform === 'linux') {
    app.setName('ODX');
  }
  
  // Set app user model ID for Windows notifications
  if (process.platform === 'win32') {
    app.setAppUserModelId('net.odamex.odx-launcher');
  }
  
  createWindow();
  createTray();

  // Set up power monitor to detect lock/unlock events
  // Note: powerMonitor is only available after 'ready' event
  powerMonitor.on('lock-screen', () => {
    console.log('[PowerMonitor] Screen locked - notifications will be queued');
    isSystemLocked = true;
  });

  powerMonitor.on('unlock-screen', () => {
    console.log('[PowerMonitor] Screen unlocked - showing queued notifications');
    isSystemLocked = false;
    
    // Show summary of queued notifications
    showQueuedNotificationsSummary();
  });

  // Also detect system suspend/resume (sleep/wake)
  powerMonitor.on('suspend', () => {
    console.log('[PowerMonitor] System suspending - notifications will be queued');
    isSystemLocked = true;
  });

  powerMonitor.on('resume', () => {
    console.log('[PowerMonitor] System resumed - showing queued notifications');
    isSystemLocked = false;
    
    // Show summary of queued notifications
    showQueuedNotificationsSummary();
  });

  // Check for updates after 3 seconds
  if (!isDevelopment) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 3000);
  }
});

app.on('window-all-closed', () => {
  // On macOS, keep the app running in the background
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  
  // In development mode, kill all processes when quitting
  if (isDevelopment) {
    process.exit(0);
  }
});

// OdalPapi IPC handlers
ipcMain.handle('odalpapi:query-master', async (event, ip: string) => {
  try {
    const result = await odalPapiService.queryMasterServer(ip);
    return result;
  } catch (err: any) {
    console.error(`[IPC] Failed to query master server ${ip}:`, err.message);
    throw new Error(err.message || 'Failed to query master server');
  }
});

ipcMain.handle('odalpapi:query-server', async (event, serverAddr: {ip: string, port: number}) => {
  try {
    const result = await odalPapiService.queryGameServer(serverAddr);
    return result;
  } catch (err: any) {
    console.error(`[IPC] Failed to query game server ${serverAddr.ip}:${serverAddr.port}:`, err.message);
    throw new Error(err.message || 'Failed to query game server');
  }
});

ipcMain.handle('odalpapi:ping-server', async (_event, serverAddr: {ip: string, port: number}) => {
  try {
    const result = await odalPapiService.pingGameServer(serverAddr);
    return result;
  } catch (err: any) {
    console.error(`[IPC] Failed to ping server ${serverAddr.ip}:${serverAddr.port}:`, err.message);
    throw new Error(err.message || 'Failed to ping server');
  }
});

// File Manager IPC handlers
ipcMain.handle('file:get-installation-info', async (_event, customPath?: string) => {
  try {
    return fileManager.getInstallationInfo(customPath);
  } catch (err: any) {
    console.error('[IPC] Failed to get installation info:', err.message);
    throw new Error(err.message || 'Failed to get installation info');
  }
});

ipcMain.handle('file:compare-versions', (_event, v1: string, v2: string) => {
  try {
    return fileManager.compareVersions(v1, v2);
  } catch (err: any) {
    console.error('[IPC] Failed to compare versions:', err.message);
    throw new Error(err.message || 'Failed to compare versions');
  }
});

ipcMain.handle('file:download', async (event, url: string, filename: string) => {
  const destPath = path.join(fileManager.getBinDirectory(), filename);
  
  try {
    await fileManager.downloadFile(url, destPath, (progress) => {
      event.sender.send('file:download-progress', progress);
    });
    return destPath;
  } catch (err: any) {
    console.error(`[IPC] Download failed for ${filename}:`, err.message);
    throw new Error(err.message || 'Download failed');
  }
});

ipcMain.handle('file:extract-zip', async (_event, zipPath: string) => {
  try {
    await fileManager.extractZip(zipPath, fileManager.getBinDirectory());
  } catch (err: any) {
    console.error(`[IPC] Failed to extract ZIP ${zipPath}:`, err.message);
    throw new Error(err.message || 'Failed to extract ZIP');
  }
});

ipcMain.handle('file:run-installer', async (_event, installerPath: string, installDir?: string) => {
  try {
    await fileManager.runInstaller(installerPath, installDir);
  } catch (err: any) {
    console.error(`[IPC] Installer failed for ${installerPath}:`, err.message);
    throw new Error(err.message || 'Installer failed');
  }
});

ipcMain.handle('file:install-flatpak', async (_event, flatpakPath: string) => {
  try {
    await fileManager.installFlatpak(flatpakPath);
  } catch (err: any) {
    console.error(`[IPC] Flatpak installation failed for ${flatpakPath}:`, err.message);
    throw new Error(err.message || 'Flatpak installation failed');
  }
});

ipcMain.handle('file:find-installer-asset', async (_event, release: any) => {
  try {
    return fileManager.findInstallerAsset(release);
  } catch (err: any) {
    console.error('[IPC] Failed to find installer asset:', err.message);
    throw new Error(err.message || 'Failed to find installer asset');
  }
});

ipcMain.handle('file:save-version', async (_event, version: string) => {
  try {
    fileManager.saveVersionInfo(version);
  } catch (err: any) {
    console.error(`[IPC] Failed to save version ${version}:`, err.message);
    throw new Error(err.message || 'Failed to save version');
  }
});

ipcMain.handle('file:get-directories', async () => {
  try {
    return {
      odx: fileManager.getOdxDirectory(),
      bin: fileManager.getBinDirectory(),
      wads: fileManager.getWadsDirectory(),
      config: fileManager.getConfigDirectory()
    };
  } catch (err: any) {
    console.error('[IPC] Failed to get directories:', err.message);
    throw new Error(err.message || 'Failed to get directories');
  }
});

ipcMain.handle('file:list-wads', async () => {
  try {
    return fileManager.listWadFiles();
  } catch (err: any) {
    console.error('[IPC] Failed to list WAD files:', err.message);
    throw new Error(err.message || 'Failed to list WAD files');
  }
});

ipcMain.handle('file:open-directory', async (_event, dirPath: string) => {
  try {
    await fileManager.openDirectory(dirPath);
  } catch (err: any) {
    console.error(`[IPC] Failed to open directory ${dirPath}:`, err.message);
    throw new Error(err.message || 'Failed to open directory');
  }
});

// Open log file directory
ipcMain.handle('app:open-log-directory', async () => {
  try {
    const logPath = log.transports.file.getFile().path;
    const logDir = path.dirname(logPath);
    await shell.openPath(logDir);
    return logDir;
  } catch (err: any) {
    log.error('[IPC] Failed to open log directory:', err);
    throw new Error(err.message || 'Failed to open log directory');
  }
});

// Get log file path
ipcMain.handle('app:get-log-path', () => {
  return log.transports.file.getFile().path;
});

ipcMain.handle('file:pick-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Select WAD Directory'
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    
    return result.filePaths[0];
  } catch (err: any) {
    console.error('[IPC] Failed to pick directory:', err.message);
    throw new Error(err.message || 'Failed to pick directory');
  }
});

ipcMain.handle('file:get-platform-asset', async () => {
  try {
    return fileManager.getPlatformAssetName();
  } catch (err: any) {
    console.error('[IPC] Failed to get platform asset:', err.message);
    throw new Error(err.message || 'Failed to get platform asset');
  }
});

ipcMain.handle('file:has-configured', async () => {
  try {
    return fileManager.hasConfiguredInstallation();
  } catch (err: any) {
    console.error('[IPC] Failed to check configuration:', err.message);
    throw new Error(err.message || 'Failed to check configuration');
  }
});

ipcMain.handle('file:save-first-run', async (_event, source: 'odx' | 'system' | 'custom', customPath?: string) => {
  try {
    fileManager.saveFirstRunChoice(source, customPath);
  } catch (err: any) {
    console.error(`[IPC] Failed to save first run choice (${source}):`, err.message);
    throw new Error(err.message || 'Failed to save first run choice');
  }
});

ipcMain.handle('file:reset-first-run', async () => {
  try {
    fileManager.resetFirstRunConfig();
  } catch (err: any) {
    console.error('[IPC] Failed to reset first run config:', err.message);
    throw new Error(err.message || 'Failed to reset first run config');
  }
});

ipcMain.handle('file:launch-odamex', async (_event, args: string[]) => {
  try {
    await fileManager.launchOdamex(args);
  } catch (err: any) {
    console.error('[IPC] Failed to launch Odamex:', err.message);
    throw new Error(err.message || 'Failed to launch Odamex');
  }
});

// IWAD Manager IPC handlers
ipcMain.handle('iwad:detect', async () => {
  try {
    return await iwadManager.detectIWADs();
  } catch (err: any) {
    console.error('[IPC] Failed to detect IWADs:', err.message);
    throw new Error(err.message || 'Failed to detect IWADs');
  }
});

ipcMain.handle('iwad:verify', async (_event, filePath: string) => {
  try {
    return await iwadManager.verifyIWAD(filePath);
  } catch (err: any) {
    console.error(`[IPC] Failed to verify IWAD ${filePath}:`, err.message);
    throw new Error(err.message || 'Failed to verify IWAD');
  }
});

ipcMain.handle('iwad:get-directories', async () => {
  try {
    return iwadManager.getWADDirectories();
  } catch (err: any) {
    console.error('[IPC] Failed to get WAD directories:', err.message);
    throw new Error(err.message || 'Failed to get WAD directories');
  }
});

ipcMain.handle('iwad:save-directories', async (_event, config: any) => {
  try {
    iwadManager.saveWADDirectories(config);
  } catch (err: any) {
    console.error('[IPC] Failed to save WAD directories:', err.message);
    throw new Error(err.message || 'Failed to save WAD directories');
  }
});

ipcMain.handle('iwad:add-directory', async (_event, directory: string) => {
  try {
    return iwadManager.addWADDirectory(directory);
  } catch (err: any) {
    console.error(`[IPC] Failed to add WAD directory ${directory}:`, err.message);
    throw new Error(err.message || 'Failed to add WAD directory');
  }
});

ipcMain.handle('iwad:remove-directory', async (_event, directory: string) => {
  try {
    iwadManager.removeWADDirectory(directory);
  } catch (err: any) {
    console.error(`[IPC] Failed to remove WAD directory ${directory}:`, err.message);
    throw new Error(err.message || 'Failed to remove WAD directory');
  }
});

ipcMain.handle('iwad:set-steam-scan', async (_event, enabled: boolean) => {
  try {
    iwadManager.setSteamScan(enabled);
  } catch (err: any) {
    console.error(`[IPC] Failed to set Steam scan to ${enabled}:`, err.message);
    throw new Error(err.message || 'Failed to set Steam scan');
  }
});

ipcMain.handle('iwad:toggle-recursive-scan', async (_event, directoryPath: string, recursive: boolean) => {
  try {
    iwadManager.toggleRecursiveScan(directoryPath, recursive);
  } catch (err: any) {
    console.error(`[IPC] Failed to toggle recursive scan for ${directoryPath}:`, err.message);
    throw new Error(err.message || 'Failed to toggle recursive scan');
  }
});

ipcMain.handle('iwad:has-directories', async () => {
  try {
    return iwadManager.hasWADDirectories();
  } catch (err: any) {
    console.error('[IPC] Failed to check WAD directories:', err.message);
    throw new Error(err.message || 'Failed to check WAD directories');
  }
});

ipcMain.handle('iwad:has-config-file', async () => {
  try {
    return iwadManager.hasWADConfigFile();
  } catch (err: any) {
    console.error('[IPC] Failed to check WAD config file:', err.message);
    throw new Error(err.message || 'Failed to check WAD config file');
  }
});

ipcMain.handle('iwad:rescan', async (_event, forceRescan: boolean = false) => {
  try {
    return await iwadManager.detectIWADs(forceRescan);
  } catch (err: any) {
    console.error('[IPC] Failed to rescan IWADs:', err.message);
    throw new Error(err.message || 'Failed to rescan IWADs');
  }
});

ipcMain.handle('iwad:get-metadata', async () => {
  try {
    return iwadManager.getGameMetadata();
  } catch (err: any) {
    console.error('[IPC] Failed to get game metadata:', err.message);
    throw new Error(err.message || 'Failed to get game metadata');
  }
});

ipcMain.handle('iwad:get-cache-stats', async () => {
  try {
    return iwadManager.getCacheStats();
  } catch (err: any) {
    console.error('[IPC] Failed to get cache stats:', err.message);
    throw new Error(err.message || 'Failed to get cache stats');
  }
});

ipcMain.handle('iwad:clear-cache', async () => {
  try {
    iwadManager.clearCache();
  } catch (err: any) {
    console.error('[IPC] Failed to clear cache:', err.message);
    throw new Error(err.message || 'Failed to clear cache');
  }
});

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // Handle second instance - includes Windows toast notification activations
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
      
      // On Windows, check for toast notification activation arguments
      if (process.platform === 'win32') {
        // Toast activation arguments are passed as command line args
        const args = commandLine.join(' ');
        
        // Parse action from toast XML arguments
        if (args.includes('action=join')) {
          const serverIdMatch = args.match(/serverId=([^&\s]+)/);
          if (serverIdMatch && serverIdMatch[1]) {
            const serverId = decodeURIComponent(serverIdMatch[1]);
            console.log('[Toast] Join server action:', serverId);
            mainWindow.webContents.send('notification-action', 'join-server', serverId);
          }
        } else if (args.includes('action=open')) {
          const serverIdMatch = args.match(/serverId=([^&\s]+)/);
          const serverId = serverIdMatch && serverIdMatch[1] ? decodeURIComponent(serverIdMatch[1]) : undefined;
          console.log('[Toast] Open servers action:', serverId);
          mainWindow.webContents.send('notification-click', serverId);
        }
      }
    }
  });
}
