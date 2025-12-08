import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export interface FirstRunChoice {
  action: 'detected' | 'download' | 'custom';
  customPath?: string;
}

/**
 * First-run setup dialog for configuring Odamex installation.
 * This is a non-dismissible modal that guides users through initial setup.
 * Uses NgbActiveModal to return the user's choice via close().
 */
@Component({
  selector: 'app-first-run-dialog',
  imports: [],
  templateUrl: './first-run-dialog.component.html',
  styleUrl: './first-run-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FirstRunDialogComponent {
  public activeModal = inject(NgbActiveModal);

  detectedPath = signal<string | null>(null);
  showCustomPath = signal(false);
  customPath = signal('');

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
    this.activeModal.close({ action: 'detected' } as FirstRunChoice);
  }

  selectDownload() {
    this.activeModal.close({ action: 'download' } as FirstRunChoice);
  }

  selectCustom() {
    if (this.customPath()) {
      this.activeModal.close({ 
        action: 'custom',
        customPath: this.customPath()
      } as FirstRunChoice);
    }
  }
}
