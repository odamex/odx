import { Component, ChangeDetectionStrategy, signal, inject, output } from '@angular/core';
import { Router } from '@angular/router';

export interface FirstRunChoice {
  action: 'detected' | 'download' | 'custom';
  customPath?: string;
}

@Component({
  selector: 'app-first-run-dialog',
  imports: [],
  templateUrl: './first-run-dialog.component.html',
  styleUrl: './first-run-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FirstRunDialogComponent {
  private router = inject(Router);

  detectedPath = signal<string | null>(null);
  showCustomPath = signal(false);
  customPath = signal('');

  choice = output<FirstRunChoice>();

  setDetectedPath(path: string | null) {
    this.detectedPath.set(path);
  }

  toggleCustomPath() {
    this.showCustomPath.set(!this.showCustomPath());
  }

  updateCustomPath(path: string) {
    this.customPath.set(path);
  }

  selectDetected() {
    this.choice.emit({ action: 'detected' });
  }

  selectDownload() {
    this.choice.emit({ action: 'download' });
  }

  selectCustom() {
    if (this.customPath()) {
      this.choice.emit({ 
        action: 'custom',
        customPath: this.customPath()
      });
    }
  }

  onOverlayClick(event: MouseEvent) {
    // Prevent closing by clicking overlay on first run
    event.stopPropagation();
  }
}
