import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { UpdatesService } from '../../shared/services/updates/updates.service';
import { AutoUpdateService } from '../../shared/services/auto-update/auto-update.service';

/**
 * Component that displays update banners for both Odamex and ODX launcher
 * 
 * Shows notification banners at the top of the app when updates are available.
 * Provides controls for downloading and installing updates.
 */
@Component({
  selector: 'app-update-banner',
  imports: [],
  templateUrl: './update-banner.component.html',
  styleUrl: './update-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpdateBannerComponent {
  protected updatesService = inject(UpdatesService);
  protected autoUpdate = inject(AutoUpdateService);
  private router = inject(Router);

  // ODX update state
  readonly odxUpdateState = this.autoUpdate.state;
  readonly odxUpdateInfo = this.autoUpdate.updateInfo;
  readonly odxDownloadProgress = this.autoUpdate.downloadProgress;
  readonly odxError = this.autoUpdate.error;

  readonly showODXBanner = computed(() => {
    const state = this.odxUpdateState();
    return state === 'available' || state === 'downloading' || state === 'downloaded' || state === 'error';
  });

  readonly odxIsAvailable = computed(() => this.odxUpdateState() === 'available');
  readonly odxIsDownloading = computed(() => this.odxUpdateState() === 'downloading');
  readonly odxIsDownloaded = computed(() => this.odxUpdateState() === 'downloaded');
  readonly odxHasError = computed(() => this.odxUpdateState() === 'error');

  readonly odxUpdateVersion = computed(() => this.odxUpdateInfo()?.version || '');
  readonly odxErrorMessage = computed(() => this.odxError() || 'Unknown error');

  readonly odxDownloadPercent = computed(() => {
    const progress = this.odxDownloadProgress();
    return progress ? Math.round(progress.percent) : 0;
  });

  readonly odxDownloadSpeed = computed(() => {
    const progress = this.odxDownloadProgress();
    if (!progress) return '';
    return `${this.autoUpdate.formatBytes(progress.bytesPerSecond)}/s`;
  });

  /**
   * Navigate to the settings page
   * Used when user clicks on Odamex update notification
   */
  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  /**
   * Dismiss the Odamex update notification
   * User can check for updates again later in settings
   */
  dismiss() {
    this.updatesService.dismiss();
  }

  /**
   * Start downloading the ODX launcher update
   * Downloads in background, progress is tracked via signals
   */
  downloadODXUpdate(): void {
    this.autoUpdate.downloadUpdate();
  }

  /**
   * Install the downloaded ODX update and restart the application
   * Shows splash screen during installation, then quits and relaunches
   */
  installODXAndRestart(): void {
    this.autoUpdate.installAndRestart();
  }

  /**
   * Dismiss the ODX update notification
   * User can manually check for updates later
   */
  dismissODXUpdate(): void {
    this.autoUpdate.dismissUpdate();
  }
}
