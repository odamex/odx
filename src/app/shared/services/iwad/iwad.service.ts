import { Injectable, inject } from '@angular/core';
import { IWADStore, type DetectedIWAD, type WADDirectoryConfig, type GameMetadata } from './iwad.store';

export type { DetectedIWAD, WADDirectoryConfig, GameMetadata } from './iwad.store';

@Injectable({
  providedIn: 'root'
})
export class IWADService {
  private store = inject(IWADStore);

  // Expose store signals
  readonly detectedIWADs = this.store.detectedIWADs;
  readonly wadDirectories = this.store.wadDirectories;
  readonly gameMetadata = this.store.gameMetadata;
  readonly loading = this.store.loading;
  readonly error = this.store.error;

  /**
   * Detect all IWADs in common locations
   */
  async detectIWADs(): Promise<DetectedIWAD[]> {
    this.store.setLoading(true);
    try {
      const detected = await window.electron.iwadManager.detectIWADs();
      this.store.setDetectedIWADs(detected);
      return detected;
    } catch (err: any) {
      this.store.setError(err.message || 'Failed to detect IWADs');
      throw err;
    } finally {
      this.store.setLoading(false);
    }
  }

  /**
   * Verify an IWAD file by path
   */
  async verifyIWAD(filePath: string): Promise<any> {
    try {
      return await window.electron.iwadManager.verifyIWAD(filePath);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to verify IWAD');
    }
  }

  /**
   * Get WAD directory configuration
   */
  async getWADDirectories(): Promise<WADDirectoryConfig> {
    this.store.setLoading(true);
    try {
      const config = await window.electron.iwadManager.getWADDirectories();
      this.store.setWADDirectories(config);
      return config;
    } catch (err: any) {
      this.store.setError(err.message || 'Failed to get WAD directories');
      throw err;
    } finally {
      this.store.setLoading(false);
    }
  }

  /**
   * Add a WAD directory to configuration
   */
  async addWADDirectory(directory: string): Promise<void> {
    try {
      await window.electron.iwadManager.addWADDirectory(directory);
      // Refresh directory config
      await this.getWADDirectories();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add WAD directory');
    }
  }

  /**
   * Remove a WAD directory from configuration
   */
  async removeWADDirectory(directory: string): Promise<void> {
    try {
      await window.electron.iwadManager.removeWADDirectory(directory);
      // Refresh directory config
      await this.getWADDirectories();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to remove WAD directory');
    }
  }

  /**
   * Enable or disable Steam installation scanning
   */
  async setSteamScan(enabled: boolean): Promise<void> {
    try {
      await window.electron.iwadManager.setSteamScan(enabled);
      // Refresh directory config
      await this.getWADDirectories();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to set Steam scan');
    }
  }

  /**
   * Check if any WAD directories are configured
   */
  async hasWADDirectories(): Promise<boolean> {
    try {
      return await window.electron.iwadManager.hasWADDirectories();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to check WAD directories');
    }
  }

  /**
   * Rescan all configured directories for IWADs
   */
  async rescanIWADs(): Promise<DetectedIWAD[]> {
    this.store.setLoading(true);
    try {
      const detected = await window.electron.iwadManager.rescanIWADs();
      this.store.setDetectedIWADs(detected);
      return detected;
    } catch (err: any) {
      this.store.setError(err.message || 'Failed to rescan IWADs');
      throw err;
    } finally {
      this.store.setLoading(false);
    }
  }

  /**
   * Get game metadata for UI display
   */
  async getGameMetadata(): Promise<Record<string, GameMetadata>> {
    try {
      const metadata = await window.electron.iwadManager.getGameMetadata();
      this.store.setGameMetadata(metadata);
      return metadata;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to get game metadata');
    }
  }
}
