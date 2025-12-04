// @ts-nocheck
/**
 * File management service for Electron main process
 * 
 * Handles:
 * - Odamex installation detection and management
 * - GitHub release checking and downloading
 * - File extraction and installation
 * - Version management
 * 
 * @module file-manager-main
 */
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as os from 'os';
import { app } from 'electron';

/**
 * Odamex Client File Locations:
 * 
 * Client logs, downloaded WADs, and config files are stored in:
 * - Windows (Installer): ~\Documents\My Games\Odamex\downloads
 * - Windows (Portable):  <odamex.exe location>\downloads
 * - macOS/Linux/BSD:     ~/.odamex/downloads
 * 
 * Installation Type Detection:
 * - Portable install (zip): Contains odamex-installed.txt in the client directory
 * - System install (exe):   Does NOT contain odamex-installed.txt
 */

/**
 * Download progress information
 */
export interface DownloadProgress {
  /** Download completion percentage (0-100) */
  percent: number;
  /** Bytes transferred so far */
  transferred: number;
  /** Total file size in bytes */
  total: number;
  /** Current download speed in bytes per second */
  bytesPerSecond: number;
}

/**
 * GitHub release asset information
 */
export interface ReleaseAsset {
  /** Asset filename */
  name: string;
  /** Direct download URL */
  browser_download_url: string;
  /** File size in bytes */
  size: number;
  /** MIME content type */
  content_type: string;
}

/**
 * GitHub release information
 */
export interface Release {
  /** Version tag (e.g., "v11.0.0") */
  tag_name: string;
  /** Release name/title */
  name: string;
  /** Release description/notes */
  body: string;
  /** Publication timestamp */
  published_at: string;
  /** Available download assets */
  assets: ReleaseAsset[];
  /** Whether this is a pre-release version */
  prerelease: boolean;
}

/**
 * Odamex installation information
 */
export interface InstallationInfo {
  /** Whether Odamex is installed */
  installed: boolean;
  /** Installed version string */
  version: string | null;
  /** Installation directory path */
  path: string | null;
  /** Path to client executable */
  clientPath: string | null;
  /** Path to server executable */
  serverPath: string | null;
  /** Installation source type */
  source: 'odx' | 'system' | 'custom' | 'none';
  /** System installation path (if detected) */
  systemInstallPath: string | null;
  /** Whether an update is available */
  needsUpdate: boolean;
  /** Latest available version */
  latestVersion: string | null;
}

/**
 * File manager service for Odamex installation and update management
 * 
 * Manages:
 * - ODX directory structure
 * - Odamex installation detection
 * - GitHub release downloads with retry logic
 * - Version comparison and update checking
 * 
 * @example
 * const fileManager = new FileManagerService();
 * const info = fileManager.getInstallationInfo();
 * if (info.installed) {
 *   console.log(`Odamex ${info.version} installed at ${info.path}`);
 * }
 */
export class FileManagerService {
  private readonly odxDir: string;
  private readonly binDir: string;
  private readonly wadsDir: string;
  private readonly configDir: string;
  private lastGitHubRequest: number = 0;
  private readonly GITHUB_MIN_INTERVAL = 1000; // Minimum 1 second between requests
  private readonly GITHUB_RETRY_DELAY = 2000; // Initial retry delay
  private readonly GITHUB_MAX_RETRIES = 3;
  
  // Cache for GitHub release data (session-based)
  private releaseCache: { data: Release | null; timestamp: number } = { data: null, timestamp: 0 };
  private allReleasesCache: { data: Release[] | null; timestamp: number } = { data: null, timestamp: 0 };
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache lifetime

  constructor() {
    // Determine platform-specific paths
    const userDataPath = app.getPath('userData');
    
    // Main ODX directory in AppData/Roaming
    this.odxDir = path.join(userDataPath, 'ODX');
    this.binDir = path.join(this.odxDir, 'bin');
    this.wadsDir = path.join(this.odxDir, 'wads');
    this.configDir = path.join(this.odxDir, 'config');

    // Ensure directories exist
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [this.odxDir, this.binDir, this.wadsDir, this.configDir];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Read version.txt from a given path
   */
  private readVersionFromPath(dirPath: string): string | null {
    const versionFile = path.join(dirPath, 'version.txt');
    if (fs.existsSync(versionFile)) {
      return fs.readFileSync(versionFile, 'utf-8').trim();
    }
    return null;
  }

  /**
   * Detect system-wide Odamex installation
   * Checks Windows registry and common installation paths
   */
  private detectSystemInstallation(): string | null {
    if (process.platform === 'win32') {
      try {
        // Try to read from Windows registry
        const { execSync } = require('child_process');
        const regQuery = 'reg query "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{2E517BBB-916F-4AB6-80E0-D4A292513F7A}_is1" /v InstallLocation';
        const output = execSync(regQuery, { encoding: 'utf-8' });
        const match = output.match(/InstallLocation\s+REG_SZ\s+(.+)/);
        if (match && match[1]) {
          const installPath = match[1].trim();
          if (fs.existsSync(installPath)) {
            return installPath;
          }
        }
      } catch (err) {
        // Registry key not found, try common paths
      }

      // Check common Windows installation paths
      const commonPaths = [
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Odamex'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Odamex'),
        'C:\\Odamex'
      ];

      for (const testPath of commonPaths) {
        if (fs.existsSync(testPath) && fs.existsSync(path.join(testPath, 'odamex.exe'))) {
          return testPath;
        }
      }
    } else if (process.platform === 'darwin') {
      // macOS common paths
      const commonPaths = [
        '/Applications/Odamex.app/Contents/MacOS',
        path.join(os.homedir(), 'Applications/Odamex.app/Contents/MacOS')
      ];
      for (const testPath of commonPaths) {
        if (fs.existsSync(testPath) && fs.existsSync(path.join(testPath, 'odamex'))) {
          return testPath;
        }
      }
    } else {
      // Linux common paths
      const commonPaths = [
        '/usr/local/bin',
        '/usr/bin',
        '/opt/odamex',
        path.join(os.homedir(), '.local/bin')
      ];
      for (const testPath of commonPaths) {
        if (fs.existsSync(testPath) && fs.existsSync(path.join(testPath, 'odamex'))) {
          return testPath;
        }
      }
    }

    return null;
  }

  /**
   * Compare two version strings (e.g., "11.0.0" vs "11.1.0")
   * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  compareVersions(v1: string, v2: string): number {
    // Remove 'v' prefix if present
    const clean1 = v1.replace(/^v/, '');
    const clean2 = v2.replace(/^v/, '');

    const parts1 = clean1.split(/[.-]/).map(p => parseInt(p) || 0);
    const parts2 = clean2.split(/[.-]/).map(p => parseInt(p) || 0);

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;

      if (num1 < num2) return -1;
      if (num1 > num2) return 1;
    }

    return 0;
  }

  /**
   * Check if installation needs update by comparing with latest release
   */
  async checkForUpdates(currentVersion: string | null): Promise<{ needsUpdate: boolean; latestVersion: string | null }> {
    try {
      const release = await this.getLatestRelease();
      const latestVersion = release.tag_name;

      if (!currentVersion) {
        return { needsUpdate: true, latestVersion };
      }

      const comparison = this.compareVersions(currentVersion, latestVersion);
      return {
        needsUpdate: comparison < 0,
        latestVersion
      };
    } catch (err) {
      console.error('Failed to check for updates:', err);
      return { needsUpdate: false, latestVersion: null };
    }
  }

  /**
   * Get installation info from ODX directory, system install, or custom path
   * Priority: Custom > ODX directory > System install
   */
  /**
   * Get information about the Odamex installation
   * 
   * Checks for Odamex in the following order:
   * 1. Custom path (if provided)
   * 2. ODX directory
   * 3. System installation
   * 
   * Installation Type Detection:
   * - Portable (zip): Contains odamex-installed.txt in the installation directory
   * - System (exe):  Does NOT contain odamex-installed.txt
   */
  getInstallationInfo(customPath?: string): InstallationInfo {
    const platform = process.platform;
    let clientExecutable = '';
    let serverExecutable = '';

    if (platform === 'win32') {
      clientExecutable = 'odamex.exe';
      serverExecutable = 'odasrv.exe';
    } else if (platform === 'darwin') {
      clientExecutable = 'odamex';
      serverExecutable = 'odasrv';
    } else {
      clientExecutable = 'odamex';
      serverExecutable = 'odasrv';
    }

    // Check custom path first
    if (customPath) {
      const clientPath = path.join(customPath, clientExecutable);
      const serverPath = path.join(customPath, serverExecutable);
      const clientExists = fs.existsSync(clientPath);
      const serverExists = fs.existsSync(serverPath);

      if (clientExists || serverExists) {
        const version = this.readVersionFromPath(customPath);
        return {
          installed: true,
          version,
          path: customPath,
          clientPath: clientExists ? clientPath : null,
          serverPath: serverExists ? serverPath : null,
          source: 'custom',
          systemInstallPath: null,
          needsUpdate: false,
          latestVersion: null
        };
      }
    }

    // Check ODX directory
    const odxClientPath = path.join(this.binDir, clientExecutable);
    const odxServerPath = path.join(this.binDir, serverExecutable);
    const odxClientExists = fs.existsSync(odxClientPath);
    const odxServerExists = fs.existsSync(odxServerPath);

    // Detect system installation (Windows registry or common paths)
    const systemInstallPath = this.detectSystemInstallation();
    let systemClientPath: string | null = null;
    let systemServerPath: string | null = null;
    let systemClientExists = false;
    let systemServerExists = false;

    if (systemInstallPath) {
      systemClientPath = path.join(systemInstallPath, clientExecutable);
      systemServerPath = path.join(systemInstallPath, serverExecutable);
      systemClientExists = fs.existsSync(systemClientPath);
      systemServerExists = fs.existsSync(systemServerPath);
    }

    // Priority: ODX directory > System install
    let source: 'odx' | 'system' | 'none' = 'none';
    let version: string | null = null;
    let installedPath: string | null = null;
    let clientPath: string | null = null;
    let serverPath: string | null = null;

    if (odxClientExists || odxServerExists) {
      source = 'odx';
      version = this.readVersionFromPath(this.binDir);
      installedPath = this.binDir;
      clientPath = odxClientExists ? odxClientPath : null;
      serverPath = odxServerExists ? odxServerPath : null;
    } else if (systemClientExists || systemServerExists) {
      source = 'system';
      version = this.readVersionFromPath(systemInstallPath!);
      installedPath = systemInstallPath;
      clientPath = systemClientExists ? systemClientPath : null;
      serverPath = systemServerExists ? systemServerPath : null;
    }

    return {
      installed: source !== 'none',
      version,
      path: installedPath,
      clientPath,
      serverPath,
      source,
      systemInstallPath,
      needsUpdate: false,
      latestVersion: null
    };
  }

  async getLatestRelease(): Promise<Release> {
    // Return cached data if still valid
    const now = Date.now();
    if (this.releaseCache.data && (now - this.releaseCache.timestamp) < this.CACHE_TTL) {
      return this.releaseCache.data;
    }
    
    // Fetch fresh data
    const release = await this.makeGitHubRequest('/repos/odamex/odamex/releases/latest');
    this.releaseCache = { data: release, timestamp: now };
    return release;
  }

  /**
   * Make GitHub API request with rate limiting and retry logic
   */
  private async makeGitHubRequest(path: string, retryCount = 0): Promise<any> {
    // Rate limiting: ensure minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastGitHubRequest;
    if (timeSinceLastRequest < this.GITHUB_MIN_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, this.GITHUB_MIN_INTERVAL - timeSinceLastRequest));
    }
    this.lastGitHubRequest = Date.now();

    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {
        'User-Agent': 'ODX-Launcher',
        'Accept': 'application/vnd.github.v3+json'
      };

      // Add GitHub token if available (increases rate limit from 60 to 5000 requests/hour)
      // Token comes from:
      // - Development: GITHUB_TOKEN in .env file
      // - Production: GITHUB_TOKEN set during build (electron-builder beforeBuild hook or CI/CD)
      const githubToken = process.env['GITHUB_TOKEN'];
      if (githubToken) {
        headers['Authorization'] = `Bearer ${githubToken}`;
      } else if (retryCount === 0) {
        console.warn('No GitHub token available. API rate limit will be 60 requests/hour instead of 5000.');
      }

      const options = {
        hostname: 'api.github.com',
        path,
        method: 'GET',
        headers
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', async () => {
          if (res.statusCode === 200) {
            try {
              const result = JSON.parse(data);
              resolve(result);
            } catch (err) {
              reject(new Error('Failed to parse GitHub API response'));
            }
          } else if (res.statusCode === 403 || res.statusCode === 429) {
            // Rate limit exceeded - implement exponential backoff
            if (retryCount < this.GITHUB_MAX_RETRIES) {
              const delay = this.GITHUB_RETRY_DELAY * Math.pow(2, retryCount);
              console.warn(`GitHub API rate limit hit. Retrying in ${delay}ms... (attempt ${retryCount + 1}/${this.GITHUB_MAX_RETRIES})`);
              
              setTimeout(async () => {
                try {
                  const result = await this.makeGitHubRequest(path, retryCount + 1);
                  resolve(result);
                } catch (err) {
                  reject(err);
                }
              }, delay);
            } else {
              reject(new Error(`GitHub API rate limit exceeded. Status: ${res.statusCode}`));
            }
          } else {
            reject(new Error(`GitHub API returned status ${res.statusCode}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error(`Failed to fetch from GitHub: ${err.message}`));
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('GitHub API request timed out'));
      });

      req.end();
    });
  }

  async getAllReleases(): Promise<Release[]> {
    // Return cached data if still valid
    const now = Date.now();
    if (this.allReleasesCache.data && (now - this.allReleasesCache.timestamp) < this.CACHE_TTL) {
      return this.allReleasesCache.data;
    }
    
    // Fetch fresh data
    const releases = await this.makeGitHubRequest('/repos/odamex/odamex/releases');
    this.allReleasesCache = { data: releases, timestamp: now };
    return releases;
  }

  async downloadFile(
    url: string, 
    destination: string,
    onProgress?: (progress: DownloadProgress) => void,
    retryCount: number = 0
  ): Promise<void> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds base delay

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destination);
      const startTime = Date.now();
      let downloadedBytes = 0;

      const cleanup = () => {
        try {
          file.close();
          if (fs.existsSync(destination)) {
            fs.unlinkSync(destination);
          }
        } catch (err) {
          console.warn('Cleanup error:', err);
        }
      };

      const retry = async (error: Error) => {
        cleanup();
        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, retryCount);
          console.warn(`Download failed: ${error.message}. Retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          
          setTimeout(async () => {
            try {
              await this.downloadFile(url, destination, onProgress, retryCount + 1);
              resolve();
            } catch (err) {
              reject(err);
            }
          }, delay);
        } else {
          reject(new Error(`Download failed after ${MAX_RETRIES} retries: ${error.message}`));
        }
      };

      const req = https.get(url, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          // Handle redirect
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            cleanup();
            this.downloadFile(redirectUrl, destination, onProgress, retryCount)
              .then(resolve)
              .catch(reject);
            return;
          }
        }

        if (res.statusCode !== 200) {
          retry(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          
          if (onProgress && totalBytes > 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const bytesPerSecond = downloadedBytes / elapsed;
            const percent = (downloadedBytes / totalBytes) * 100;

            onProgress({
              percent,
              transferred: downloadedBytes,
              total: totalBytes,
              bytesPerSecond
            });
          }
        });

        res.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });

        file.on('error', (err) => {
          retry(err);
        });
      });

      req.on('error', (err) => {
        retry(err);
      });

      req.setTimeout(60000, () => {
        req.destroy();
        retry(new Error('Download timed out'));
      });
    });
  }

  getPlatformAssetName(): string {
    const platform = process.platform;
    const arch = process.arch;

    if (platform === 'win32') {
      // Use installer EXE which handles:
      // - Registry entries for .odd file association
      // - odamex:// URI scheme registration
      // - VC++ runtime installation
      // - Start Menu shortcuts
      // - Proper uninstaller
      // Note: Filename pattern is odamex-win-{version}.exe (e.g., odamex-win-11.0.0.exe)
      return 'odamex-win-*.exe'; // Wildcard will be resolved from release assets
    } else if (platform === 'darwin') {
      return 'odamex-macos.dmg';
    } else if (platform === 'linux') {
      // Prefer AppImage for Linux
      return 'odamex-linux-x86_64.AppImage';
    }

    throw new Error(`Unsupported platform: ${platform}`);
  }

  async extractZip(zipPath: string, destPath: string): Promise<void> {
    // For now, we'll handle Windows ZIP extraction
    // For production, consider using a library like 'extract-zip' or 'unzipper'
    return new Promise((resolve, reject) => {
      if (process.platform !== 'win32') {
        reject(new Error('ZIP extraction not implemented for this platform'));
        return;
      }

      // Use PowerShell to extract on Windows
      const { exec } = require('child_process');
      const command = `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destPath}' -Force"`;

      exec(command, (error: any, stdout: any, stderr: any) => {
        if (error) {
          reject(new Error(`Failed to extract ZIP: ${error.message}`));
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Run Windows installer silently
   * The Inno Setup installer handles:
   * - Registry entries for .odd file association
   * - odamex:// URI scheme
   * - VC++ runtime (if needed)
   * - Start Menu shortcuts
   * - Proper uninstaller registration
   */
  async runInstaller(installerPath: string, installDir?: string): Promise<void> {
    if (process.platform !== 'win32') {
      throw new Error('Installer execution is only supported on Windows');
    }

    const targetDir = installDir || this.binDir;

    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      
      // Inno Setup command line parameters:
      // /VERYSILENT = Silent mode, no UI
      // /SUPPRESSMSGBOXES = Suppress message boxes
      // /NORESTART = Don't restart computer
      // /DIR="path" = Installation directory
      // /NOICONS = Don't create Start Menu folder (optional)
      const args = [
        '/VERYSILENT',
        '/SUPPRESSMSGBOXES',
        '/NORESTART',
        `/DIR="${targetDir}"`
      ];

      const command = `"${installerPath}" ${args.join(' ')}`;
      console.log('Running installer:', command);

      exec(command, { timeout: 120000 }, (error: any, stdout: any, stderr: any) => {
        if (error) {
          reject(new Error(`Installer failed: ${error.message}`));
          return;
        }
        if (stderr) {
          console.error('Installer stderr:', stderr);
        }
        if (stdout) {
          console.log('Installer output:', stdout);
        }
        console.log('Installation completed successfully');
        resolve();
      });
    });
  }

  /**
   * Find the actual installer filename from release assets
   * Returns the first .exe file matching the pattern odamex-win-*.exe
   */
  findInstallerAsset(release: any): string | null {
    if (!release || !release.assets) {
      return null;
    }

    const installerAsset = release.assets.find((asset: any) => {
      return asset.name.startsWith('odamex-win-') && asset.name.endsWith('.exe');
    });

    return installerAsset ? installerAsset.name : null;
  }

  saveVersionInfo(version: string): void {
    const versionFile = path.join(this.binDir, 'version.txt');
    fs.writeFileSync(versionFile, version, 'utf-8');
  }

  getOdxDirectory(): string {
    return this.odxDir;
  }

  getBinDirectory(): string {
    return this.binDir;
  }

  getWadsDirectory(): string {
    return this.wadsDir;
  }

  getConfigDirectory(): string {
    return this.configDir;
  }

  listWadFiles(): string[] {
    if (!fs.existsSync(this.wadsDir)) {
      return [];
    }

    return fs.readdirSync(this.wadsDir)
      .filter(file => file.toLowerCase().endsWith('.wad'))
      .sort();
  }

  async openDirectory(dirPath: string): Promise<void> {
    const { shell } = require('electron');
    await shell.openPath(dirPath);
  }

  /**
   * Check if the user has completed first run configuration
   */
  hasConfiguredInstallation(): boolean {
    const configFile = path.join(this.configDir, 'installation.json');
    return fs.existsSync(configFile);
  }

  /**
   * Save the user's first run installation choice
   */
  saveFirstRunChoice(source: 'odx' | 'system' | 'custom', customPath?: string): void {
    const configFile = path.join(this.configDir, 'installation.json');
    const config = {
      source,
      customPath: customPath || null,
      configuredAt: new Date().toISOString()
    };
    
    // Ensure config directory exists
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * Reset the first run configuration
   */
  resetFirstRunConfig(): void {
    const configFile = path.join(this.configDir, 'installation.json');
    if (fs.existsSync(configFile)) {
      fs.unlinkSync(configFile);
    }
  }

  /**
   * Launch Odamex client with optional parameters
   * @param args - Command line arguments to pass to Odamex
   */
  async launchOdamex(args: string[] = []): Promise<void> {
    const { spawn } = require('child_process');
    const installInfo = await this.getInstallationInfo();

    if (!installInfo.installed || !installInfo.clientPath) {
      throw new Error('Odamex is not installed or client path not found');
    }

    if (!fs.existsSync(installInfo.clientPath)) {
      throw new Error(`Odamex client not found at ${installInfo.clientPath}`);
    }

    // Launch the client as a detached process
    const child = spawn(installInfo.clientPath, args, {
      detached: true,
      stdio: 'ignore',
      cwd: path.dirname(installInfo.clientPath)
    });

    // Unref the child process so the parent can exit independently
    child.unref();
  }
}
