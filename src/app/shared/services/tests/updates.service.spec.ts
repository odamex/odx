import { TestBed } from '@angular/core/testing';
import { UpdatesService, OdamexUpdateInfo } from '../updates.service';
import { FileManagerService } from '../file-manager.service';

describe('UpdatesService', () => {
  let service: UpdatesService;
  let mockFileManager: jasmine.SpyObj<FileManagerService>;

  const mockInstallInfo = {
    installed: true,
    version: '10.4.0',
    path: 'C:\\odamex',
    clientPath: 'C:\\odamex\\odamex.exe',
    serverPath: 'C:\\odamex\\odasrv.exe',
    source: 'odx' as const,
    systemInstallPath: null,
    needsUpdate: false,
    latestVersion: '10.4.0'
  };

  const mockRelease = {
    id: 12345,
    tagName: 'v10.5.0',
    name: 'Odamex 10.5.0',
    body: 'Release notes',
    htmlUrl: 'https://github.com/odamex/odamex/releases/tag/v10.5.0',
    publishedAt: '2025-01-01T00:00:00Z',
    assets: [],
    prerelease: false,
    draft: false
  };

  beforeEach(() => {
    mockFileManager = jasmine.createSpyObj('FileManagerService', [
      'getInstallationInfo',
      'getLatestRelease',
      'checkForUpdates'
    ]);

    TestBed.configureTestingModule({
      providers: [
        UpdatesService,
        { provide: FileManagerService, useValue: mockFileManager }
      ]
    });
    
    service = TestBed.inject(UpdatesService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkForUpdates', () => {
    it('should detect available updates', async () => {
      mockFileManager.getInstallationInfo.and.returnValue(Promise.resolve(mockInstallInfo));
      mockFileManager.getLatestRelease.and.returnValue(Promise.resolve(mockRelease));
      mockFileManager.checkForUpdates.and.returnValue(
        Promise.resolve({ needsUpdate: true, latestVersion: '10.5.0' })
      );

      const result = await service.checkForUpdates();

      expect(result.available).toBe(true);
      expect(result.currentVersion).toBe('10.4.0');
      expect(result.latestVersion).toBe('10.5.0');
      expect(result.releaseUrl).toBe('https://github.com/odamex/odamex/releases/tag/v10.5.0');
    });

    it('should return no update when versions match', async () => {
      mockFileManager.getInstallationInfo.and.returnValue(
        Promise.resolve({ ...mockInstallInfo, version: '10.5.0' })
      );
      mockFileManager.getLatestRelease.and.returnValue(Promise.resolve(mockRelease));
      mockFileManager.checkForUpdates.and.returnValue(
        Promise.resolve({ needsUpdate: false, latestVersion: '10.5.0' })
      );

      const result = await service.checkForUpdates();

      expect(result.available).toBe(false);
      expect(result.currentVersion).toBe('10.5.0');
      expect(result.latestVersion).toBe('10.5.0');
    });

    it('should return no update when not installed', async () => {
      mockFileManager.getInstallationInfo.and.returnValue(
        Promise.resolve({ 
          installed: false, 
          version: null, 
          path: null,
          clientPath: null,
          serverPath: null,
          source: 'none' as const,
          systemInstallPath: null,
          needsUpdate: false,
          latestVersion: null
        })
      );
      mockFileManager.getLatestRelease.and.returnValue(Promise.resolve(mockRelease));

      const result = await service.checkForUpdates();

      expect(result.available).toBe(false);
      expect(result.currentVersion).toBeNull();
    });

    it('should return no update when version is null', async () => {
      mockFileManager.getInstallationInfo.and.returnValue(
        Promise.resolve({ 
          installed: true, 
          version: null, 
          path: 'C:\\odamex',
          clientPath: 'C:\\odamex\\odamex.exe',
          serverPath: 'C:\\odamex\\odasrv.exe',
          source: 'system' as const,
          systemInstallPath: 'C:\\odamex',
          needsUpdate: false,
          latestVersion: null
        })
      );
      mockFileManager.getLatestRelease.and.returnValue(Promise.resolve(mockRelease));

      const result = await service.checkForUpdates();

      expect(result.available).toBe(false);
    });

    it('should skip check when disabled', async () => {
      service.setCheckEnabled(false);

      const result = await service.checkForUpdates();

      expect(mockFileManager.getInstallationInfo).not.toHaveBeenCalled();
      expect(result.available).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockFileManager.getInstallationInfo.and.returnValue(
        Promise.reject(new Error('File system error'))
      );

      const result = await service.checkForUpdates();

      expect(result.available).toBe(false);
      expect(result.currentVersion).toBeNull();
    });
  });

  describe('hasUpdate', () => {
    it('should return true when update available and not dismissed', async () => {
      mockFileManager.getInstallationInfo.and.returnValue(Promise.resolve(mockInstallInfo));
      mockFileManager.getLatestRelease.and.returnValue(Promise.resolve(mockRelease));
      mockFileManager.checkForUpdates.and.returnValue(
        Promise.resolve({ needsUpdate: true, latestVersion: '10.5.0' })
      );

      await service.checkForUpdates();

      expect(service.hasUpdate()).toBe(true);
    });

    it('should return false when update is dismissed', async () => {
      mockFileManager.getInstallationInfo.and.returnValue(Promise.resolve(mockInstallInfo));
      mockFileManager.getLatestRelease.and.returnValue(Promise.resolve(mockRelease));
      mockFileManager.checkForUpdates.and.returnValue(
        Promise.resolve({ needsUpdate: true, latestVersion: '10.5.0' })
      );

      await service.checkForUpdates();
      service.dismiss();

      expect(service.hasUpdate()).toBe(false);
    });

    it('should return false when no update available', async () => {
      mockFileManager.getInstallationInfo.and.returnValue(
        Promise.resolve({ ...mockInstallInfo, version: '10.5.0' })
      );
      mockFileManager.getLatestRelease.and.returnValue(Promise.resolve(mockRelease));
      mockFileManager.checkForUpdates.and.returnValue(
        Promise.resolve({ needsUpdate: false, latestVersion: '10.5.0' })
      );

      await service.checkForUpdates();

      expect(service.hasUpdate()).toBe(false);
    });
  });

  describe('dismiss', () => {
    it('should dismiss current update', async () => {
      mockFileManager.getInstallationInfo.and.returnValue(Promise.resolve(mockInstallInfo));
      mockFileManager.getLatestRelease.and.returnValue(Promise.resolve(mockRelease));
      mockFileManager.checkForUpdates.and.returnValue(
        Promise.resolve({ needsUpdate: true, latestVersion: '10.5.0' })
      );

      await service.checkForUpdates();
      expect(service.hasUpdate()).toBe(true);

      service.dismiss();
      expect(service.hasUpdate()).toBe(false);
    });
  });

  describe('undismiss', () => {
    it('should reset dismissed state', async () => {
      mockFileManager.getInstallationInfo.and.returnValue(Promise.resolve(mockInstallInfo));
      mockFileManager.getLatestRelease.and.returnValue(Promise.resolve(mockRelease));
      mockFileManager.checkForUpdates.and.returnValue(
        Promise.resolve({ needsUpdate: true, latestVersion: '10.5.0' })
      );

      await service.checkForUpdates();
      service.dismiss();
      expect(service.hasUpdate()).toBe(false);

      service.undismiss();
      expect(service.hasUpdate()).toBe(true);
    });
  });

  describe('setCheckEnabled', () => {
    it('should enable update checks', () => {
      service.setCheckEnabled(true);
      expect(service.isCheckEnabled()).toBe(true);
    });

    it('should disable update checks', () => {
      service.setCheckEnabled(false);
      expect(service.isCheckEnabled()).toBe(false);
    });
  });

  describe('updateDetails', () => {
    it('should return current update info', async () => {
      mockFileManager.getInstallationInfo.and.returnValue(Promise.resolve(mockInstallInfo));
      mockFileManager.getLatestRelease.and.returnValue(Promise.resolve(mockRelease));
      mockFileManager.checkForUpdates.and.returnValue(
        Promise.resolve({ needsUpdate: true, latestVersion: '10.5.0' })
      );

      await service.checkForUpdates();
      const details = service.updateDetails();

      expect(details.available).toBe(true);
      expect(details.currentVersion).toBe('10.4.0');
      expect(details.latestVersion).toBe('10.5.0');
      expect(details.releaseUrl).toBeTruthy();
      expect(details.releaseName).toBe('Odamex 10.5.0');
    });
  });
});
