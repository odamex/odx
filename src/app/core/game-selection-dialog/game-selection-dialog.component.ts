import { Component, inject, output, input, effect } from '@angular/core';
import { IWADService } from '../../shared/services/iwad/iwad.service';

@Component({
  selector: 'app-game-selection-dialog',
  imports: [],
  templateUrl: './game-selection-dialog.component.html',
  standalone: true
})
export class GameSelectionDialogComponent {
  iwadService = inject(IWADService);

  visible = input.required<boolean>();
  confirmed = output<void>();
  cancelled = output<void>();

  constructor() {
    // When dialog becomes visible, immediately open directory picker
    effect(() => {
      if (this.visible()) {
        this.openDirectoryPicker();
      }
    });
  }

  async openDirectoryPicker() {
    // TODO: Implement directory picker using Electron's dialog API
    // For now, just call confirmed to close the dialog
    // Example implementation:
    // const directory = await window.electron.fileManager.openDirectoryPicker();
    // if (directory) {
    //   await this.iwadService.addWADDirectory(directory);
    //   this.confirmed.emit();
    // } else {
    //   this.cancelled.emit();
    // }
    
    // Temporary: just close for now
    setTimeout(() => {
      this.confirmed.emit();
    }, 100);
  }
}
