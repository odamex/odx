import { Component, inject, output, input, signal, effect } from '@angular/core';
import { IWADService, type WADDirectory } from '@shared/services';

@Component({
  selector: 'app-game-selection-dialog',
  imports: [],
  templateUrl: './game-selection-dialog.component.html',
  styleUrl: '../../shared/styles/_dialog.scss',
  standalone: true
})
export class GameSelectionDialogComponent {
  iwadService = inject(IWADService);

  visible = input.required<boolean>();
  confirmed = output<void>();
  cancelled = output<void>();

  directories = signal<WADDirectory[]>([]);
  steamScan = signal(true);
  isLoading = signal(false);

  constructor() {
    // Load current config when dialog becomes visible
    effect(() => {
      if (this.visible()) {
        this.loadCurrentConfig();
      }
    });
  }

  async loadCurrentConfig() {
    try {
      const config = await this.iwadService.getWADDirectories();
      this.directories.set(config.directories);
      this.steamScan.set(config.scanSteam);
    } catch (err) {
      console.error('Failed to load WAD config:', err);
    }
  }

  async addDirectory() {
    try {
      const directory = await window.electron.fileManager.pickDirectory();
      if (directory && !this.directories().some(d => d.path === directory)) {
        this.directories.set([...this.directories(), { path: directory, recursive: false }]);
      }
    } catch (err) {
      console.error('Failed to pick directory:', err);
    }
  }

  removeDirectory(dirPath: string) {
    this.directories.set(this.directories().filter(d => d.path !== dirPath));
  }

  toggleRecursive(dirPath: string) {
    this.directories.set(
      this.directories().map(d => 
        d.path === dirPath ? { ...d, recursive: !d.recursive } : d
      )
    );
  }

  toggleSteamScan() {
    this.steamScan.set(!this.steamScan());
  }

  async confirm() {
    this.isLoading.set(true);
    try {
      // Save entire configuration at once
      await this.iwadService.saveWADDirectories({
        directories: this.directories(),
        scanSteam: this.steamScan()
      });
      this.confirmed.emit();
    } catch (err) {
      console.error('Failed to save WAD config:', err);
      alert('Failed to save configuration. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  cancel() {
    this.cancelled.emit();
  }
}
