import { Injectable, signal } from '@angular/core';
import { FileManagerService } from '@shared/services/file-manager/file-manager.service';

export interface UpdateInfo {
  available: boolean;
  currentVersion: string | null;
  latestVersion: string | null;
  releaseUrl: string | null;
  releaseName: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class UpdatesService {
  private updateInfo = signal<UpdateInfo>({
    available: false,
    currentVersion: null,
    latestVersion: null,
    releaseUrl: null,
    releaseName: null
  });

  private checkEnabled = signal(true); // Can be toggled in settings
  private dismissed = signal(false);

  readonly hasUpdate = () => this.updateInfo().available && !this.dismissed();
  readonly updateDetails = () => this.updateInfo();
  readonly isCheckEnabled = () => this.checkEnabled();

  constructor(private fileManager: FileManagerService) {}

  /**
   * Check for updates on startup
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    if (!this.checkEnabled()) {
      return this.updateInfo();
    }

    try {
      const [installInfo, release] = await Promise.all([
        this.fileManager.getInstallationInfo(),
        this.fileManager.getLatestRelease()
      ]);

      if (!installInfo.installed || !installInfo.version) {
        // No installation to update
        return this.updateInfo();
      }

      const updateCheck = await this.fileManager.checkForUpdates(installInfo.version);

      const info: UpdateInfo = {
        available: updateCheck.needsUpdate,
        currentVersion: installInfo.version,
        latestVersion: updateCheck.latestVersion || null,
        releaseUrl: release?.html_url || null,
        releaseName: release?.name || null
      };

      this.updateInfo.set(info);
      this.dismissed.set(false); // Reset dismissed state on new check

      return info;
    } catch (err) {
      console.error('Failed to check for updates:', err);
      return this.updateInfo();
    }
  }

  /**
   * Dismiss the update notification
   */
  dismiss() {
    this.dismissed.set(true);
  }

  /**
   * Show the notification again (useful after refresh)
   */
  undismiss() {
    this.dismissed.set(false);
  }

  /**
   * Enable or disable automatic update checks
   */
  setCheckEnabled(enabled: boolean) {
    this.checkEnabled.set(enabled);
  }

  /**
   * Clear update info
   */
  clear() {
    this.updateInfo.set({
      available: false,
      currentVersion: null,
      latestVersion: null,
      releaseUrl: null,
      releaseName: null
    });
    this.dismissed.set(false);
  }
}
