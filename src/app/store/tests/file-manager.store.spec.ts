import { TestBed } from '@angular/core/testing';
import { FileManagerStore } from '../file-manager.store';
import { InstallationInfo, DownloadProgress, DirectoryInfo } from '@shared/services';

describe('FileManagerStore', () => {
  let store: InstanceType<typeof FileManagerStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FileManagerStore]
    });
    
    store = TestBed.inject(FileManagerStore);
  });

  describe('Initial State', () => {
    it('should initialize with null values and empty arrays', () => {
      expect(store.installationInfo()).toBeNull();
      expect(store.downloadProgress()).toBeNull();
      expect(store.directories()).toBeNull();
      expect(store.wadFiles()).toEqual([]);
      expect(store.latestRelease()).toBeNull();
      expect(store.platformAsset()).toBe('');
      expect(store.customPath()).toBe('');
      expect(store.useCustomPath()).toBe(false);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });
  });

  describe('setInstallationInfo', () => {
    it('should update installation info and clear loading/error', () => {
      const mockInfo: InstallationInfo = {
        installed: true,
        version: '11.3.0',
        path: '/path/to/odamex',
        clientPath: '/path/to/odamex',
        serverPath: '/path/to/odasrv',
        source: 'odx',
        systemInstallPath: null,
        needsUpdate: false,
        latestVersion: null
      };

      store.setLoading(true);
      store.setError('test error');
      store.setInstallationInfo(mockInfo);
      
      expect(store.installationInfo()).toEqual(mockInfo);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });
  });

  describe('setDownloadProgress', () => {
    it('should update download progress', () => {
      const mockProgress: DownloadProgress = {
        percent: 50,
        transferred: 5000000,
        total: 10000000,
        bytesPerSecond: 1000000
      };

      store.setDownloadProgress(mockProgress);
      
      expect(store.downloadProgress()).toEqual(mockProgress);
    });

    it('should allow setting progress to null', () => {
      const mockProgress: DownloadProgress = {
        percent: 50,
        transferred: 5000000,
        total: 10000000,
        bytesPerSecond: 1000000
      };

      store.setDownloadProgress(mockProgress);
      store.setDownloadProgress(null);
      
      expect(store.downloadProgress()).toBeNull();
    });
  });

  describe('clearDownloadProgress', () => {
    it('should clear download progress', () => {
      const mockProgress: DownloadProgress = {
        percent: 50,
        transferred: 5000000,
        total: 10000000,
        bytesPerSecond: 1000000
      };

      store.setDownloadProgress(mockProgress);
      store.clearDownloadProgress();
      
      expect(store.downloadProgress()).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should update loading state', () => {
      store.setLoading(true);
      expect(store.loading()).toBe(true);
      
      store.setLoading(false);
      expect(store.loading()).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error and clear loading', () => {
      store.setLoading(true);
      store.setError('Test error message');
      
      expect(store.error()).toBe('Test error message');
      expect(store.loading()).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      store.setError('Test error');
      store.clearError();
      
      expect(store.error()).toBeNull();
    });
  });

  describe('setDirectories', () => {
    it('should update directories', () => {
      const mockDirectories: DirectoryInfo = {
        odx: '/path/to/odx',
        bin: '/path/to/bin',
        wads: '/path/to/wads',
        config: '/path/to/config'
      };

      store.setDirectories(mockDirectories);
      
      expect(store.directories()).toEqual(mockDirectories);
    });
  });

  describe('setWadFiles', () => {
    it('should update WAD files list', () => {
      const mockWadFiles = ['doom.wad', 'doom2.wad', 'plutonia.wad'];

      store.setWadFiles(mockWadFiles);
      
      expect(store.wadFiles()).toEqual(mockWadFiles);
    });

    it('should replace existing WAD files', () => {
      store.setWadFiles(['doom.wad']);
      store.setWadFiles(['doom2.wad', 'plutonia.wad']);
      
      expect(store.wadFiles()).toEqual(['doom2.wad', 'plutonia.wad']);
    });
  });

  describe('setLatestRelease', () => {
    it('should update latest release', () => {
      const mockRelease = {
        tag_name: 'v11.3.0',
        name: 'Odamex 11.3.0',
        assets: []
      };

      store.setLatestRelease(mockRelease);
      
      expect(store.latestRelease()).toEqual(mockRelease);
    });
  });

  describe('setPlatformAsset', () => {
    it('should update platform asset', () => {
      const assetUrl = 'https://github.com/odamex/odamex/releases/download/v11.3.0/odamex-win64-11.3.0.zip';

      store.setPlatformAsset(assetUrl);
      
      expect(store.platformAsset()).toBe(assetUrl);
    });
  });

  describe('setCustomPath', () => {
    it('should update custom path', () => {
      const customPath = '/custom/odamex/path';

      store.setCustomPath(customPath);
      
      expect(store.customPath()).toBe(customPath);
    });
  });

  describe('setUseCustomPath', () => {
    it('should update use custom path flag', () => {
      store.setUseCustomPath(true);
      expect(store.useCustomPath()).toBe(true);
      
      store.setUseCustomPath(false);
      expect(store.useCustomPath()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set various values
      store.setInstallationInfo({
        installed: true,
        version: '11.3.0',
        path: '/path/to/odamex',
        clientPath: '/path/to/odamex',
        serverPath: null,
        source: 'odx',
        systemInstallPath: null,
        needsUpdate: false,
        latestVersion: null
      });
      store.setWadFiles(['doom.wad']);
      store.setCustomPath('/custom/path');
      store.setUseCustomPath(true);
      store.setLoading(true);
      store.setError('test error');
      
      // Reset
      store.reset();
      
      // Verify all values are reset
      expect(store.installationInfo()).toBeNull();
      expect(store.downloadProgress()).toBeNull();
      expect(store.directories()).toBeNull();
      expect(store.wadFiles()).toEqual([]);
      expect(store.latestRelease()).toBeNull();
      expect(store.platformAsset()).toBe('');
      expect(store.customPath()).toBe('');
      expect(store.useCustomPath()).toBe(false);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });
  });

  describe('State Interactions', () => {
    it('should handle multiple state updates independently', () => {
      store.setLoading(true);
      expect(store.loading()).toBe(true);
      expect(store.error()).toBeNull();
      
      store.setError('error occurred');
      expect(store.error()).toBe('error occurred');
      expect(store.loading()).toBe(false);
      
      store.clearError();
      expect(store.error()).toBeNull();
      expect(store.loading()).toBe(false);
    });

    it('should maintain independent state for different properties', () => {
      const mockInfo: InstallationInfo = {
        installed: true,
        version: '11.3.0',
        path: '/path/to/odamex',
        clientPath: '/path/to/odamex',
        serverPath: null,
        source: 'odx',
        systemInstallPath: null,
        needsUpdate: false,
        latestVersion: null
      };
      const mockWadFiles = ['doom.wad', 'doom2.wad'];

      store.setInstallationInfo(mockInfo);
      store.setWadFiles(mockWadFiles);
      
      expect(store.installationInfo()).toEqual(mockInfo);
      expect(store.wadFiles()).toEqual(mockWadFiles);
    });
  });
});
