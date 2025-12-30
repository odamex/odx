import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UpdateBannerComponent } from './update-banner.component';
import { UpdatesService, AutoUpdateService, FileManagerService } from '@shared/services';
import { Router } from '@angular/router';
import { signal } from '@angular/core';

class UpdatesServiceStub {
  private updateInfoSignal = signal({
    available: false,
    currentVersion: '1.0.0',
    latestVersion: '2.0.0',
    releaseUrl: null,
    releaseName: null
  });

  hasUpdate = () => this.updateInfoSignal().available;
  updateDetails = () => this.updateInfoSignal();
  dismiss = jasmine.createSpy('dismiss');

  setAvailable(available: boolean) {
    this.updateInfoSignal.update(info => ({ ...info, available }));
  }
}

class AutoUpdateServiceStub {
  private stateSignal = signal<'idle' | 'available' | 'downloading' | 'downloaded' | 'error'>('idle');
  private updateInfoSignal = signal<{ version: string } | null>(null);
  private downloadProgressSignal = signal<{ percent: number; bytesPerSecond: number } | null>(null);
  private errorSignal = signal<string | null>(null);

  readonly state = this.stateSignal.asReadonly();
  readonly updateInfo = this.updateInfoSignal.asReadonly();
  readonly downloadProgress = this.downloadProgressSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  downloadUpdate = jasmine.createSpy('downloadUpdate');
  installAndRestart = jasmine.createSpy('installAndRestart');
  dismissUpdate = jasmine.createSpy('dismissUpdate');
  formatBytes = jasmine.createSpy('formatBytes').and.callFake((bytes: number) => `${bytes} B`);

  setState(state: 'idle' | 'available' | 'downloading' | 'downloaded' | 'error') {
    this.stateSignal.set(state);
  }

  setUpdateInfo(info: { version: string } | null) {
    this.updateInfoSignal.set(info);
  }

  setDownloadProgress(progress: { percent: number; bytesPerSecond: number } | null) {
    this.downloadProgressSignal.set(progress);
  }

  setError(message: string | null) {
    this.errorSignal.set(message);
  }
}

class FileManagerServiceStub {
  getLatestRelease = jasmine.createSpy('getLatestRelease').and.resolveTo(null);
  findInstallerAsset = jasmine.createSpy('findInstallerAsset');
  getPlatformAssetName = jasmine.createSpy('getPlatformAssetName');
  downloadFile = jasmine.createSpy('downloadFile');
  runInstaller = jasmine.createSpy('runInstaller');
  extractZip = jasmine.createSpy('extractZip');
  installFlatpak = jasmine.createSpy('installFlatpak');
  saveVersion = jasmine.createSpy('saveVersion');
  clearReleaseCache = jasmine.createSpy('clearReleaseCache');
}

describe('UpdateBannerComponent', () => {
  let component: UpdateBannerComponent;
  let fixture: ComponentFixture<UpdateBannerComponent>;
  let updatesService: UpdatesServiceStub;
  let autoUpdate: AutoUpdateServiceStub;
  const originalElectron = (window as any).electron;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateBannerComponent],
      providers: [
        { provide: UpdatesService, useClass: UpdatesServiceStub },
        { provide: AutoUpdateService, useClass: AutoUpdateServiceStub },
        { provide: FileManagerService, useClass: FileManagerServiceStub },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateBannerComponent);
    component = fixture.componentInstance;
    updatesService = TestBed.inject(UpdatesService) as unknown as UpdatesServiceStub;
    autoUpdate = TestBed.inject(AutoUpdateService) as unknown as AutoUpdateServiceStub;
    fixture.detectChanges();
  });

  afterEach(() => {
    (window as any).electron = originalElectron;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render ODX banner when update is available', () => {
    autoUpdate.setState('available');
    autoUpdate.setUpdateInfo({ version: '2.1.0' });
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.odx-update');
    expect(banner).not.toBeNull();
    expect(banner.textContent).toContain('2.1.0');
  });

  it('should not render ODX banner when update is idle', () => {
    autoUpdate.setState('idle');
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('.odx-update');
    expect(banner).toBeNull();
  });

  it('should compute download percent from progress', () => {
    autoUpdate.setState('downloading');
    autoUpdate.setDownloadProgress({ percent: 55.4, bytesPerSecond: 1024 });
    expect(component.odxDownloadPercent()).toBe(55);
  });

  it('should call auto-update actions', () => {
    component.downloadODXUpdate();
    component.installODXAndRestart();
    component.dismissODXUpdate();

    expect(autoUpdate.downloadUpdate).toHaveBeenCalled();
    expect(autoUpdate.installAndRestart).toHaveBeenCalled();
    expect(autoUpdate.dismissUpdate).toHaveBeenCalled();
  });

  it('should dismiss odamex updates', () => {
    component.dismiss();
    expect(updatesService.dismiss).toHaveBeenCalled();
  });

  it('should navigate to settings', () => {
    const router = TestBed.inject(Router);
    component.navigateToSettings();
    expect(router.navigate).toHaveBeenCalledWith(['/settings']);
  });

  it('should stop Odamex download when no release is found', fakeAsync(() => {
    (window as any).electron = { platform: 'win32' };
    (component as any).odamexDownloading.set(true);
    component.downloadOdamexUpdate();
    tick();
    expect((component as any).odamexDownloading()).toBe(false);
  }));
});
