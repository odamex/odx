import { Component, ChangeDetectionStrategy, inject, OnDestroy, effect, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FileManagerService, IWADService, ControllerService, ControllerFocusService, GamepadButton, type ControllerEvent } from '@shared/services';

@Component({
  selector: 'app-singleplayer',
  templateUrl: './singleplayer.component.html',
  styleUrl: './singleplayer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SingleplayerComponent implements OnDestroy {
  @ViewChildren('actionButton') actionButtons!: QueryList<ElementRef<HTMLButtonElement>>;
  
  private fileManager = inject(FileManagerService);
  private iwadService = inject(IWADService);
  private controllerService = inject(ControllerService);
  private focusService = inject(ControllerFocusService);
  
  private controllerUnsubscribe?: () => void;
  private currentFocusIndex = 0;
  private justEnteredContent = false;
  
  constructor() {
    // Watch for content focus and auto-focus launch button
    effect(() => {
      if (this.focusService.focusArea() === 'content') {
        // Set flag to prevent immediate activation
        this.justEnteredContent = true;
        setTimeout(() => {
          this.focusCurrentItem();
          // Clear flag after button press would have been processed
          setTimeout(() => this.justEnteredContent = false, 100);
        }, 50);
      }
    });
    
    // Setup controller event listener
    this.controllerUnsubscribe = this.controllerService.addEventListener(
      (event: ControllerEvent) => this.handleControllerEvent(event)
    );
  }
  
  ngOnDestroy() {
    this.controllerUnsubscribe?.();
  }
  
  private handleControllerEvent(event: ControllerEvent) {
    // Only handle events when content area has focus
    if (!this.focusService.hasFocus('content')) return;
    
    // Ignore events immediately after entering content to prevent the navigation A press from activating items
    if (this.justEnteredContent) return;

    // Handle button press events
    if (event.type === 'buttonpress') {
      switch (event.button) {
        case GamepadButton.A:
          this.activateCurrentItem();
          break;
        case GamepadButton.B:
          this.focusService.returnToNavigation();
          break;
      }
    }
  }
  
  private focusCurrentItem() {
    const buttons = this.actionButtons.toArray();
    if (buttons.length > 0 && buttons[this.currentFocusIndex]) {
      buttons[this.currentFocusIndex].nativeElement.focus();
    }
  }
  
  private activateCurrentItem() {
    const buttons = this.actionButtons.toArray();
    if (buttons.length > 0 && buttons[this.currentFocusIndex]) {
      buttons[this.currentFocusIndex].nativeElement.click();
    }
  }

  async launchOdamex() {
    try {
      const args: string[] = [];

      // Add WAD directories so client knows where to find IWADs
      const wadDirs = this.iwadService.wadDirectories();
      
      if (wadDirs.directories && wadDirs.directories.length > 0) {
        const dirPaths = wadDirs.directories.map(dir => dir.path);
        const separator = window.electron.platform === 'win32' ? ';' : ':';
        const wadDirPath = dirPaths.join(separator);
        args.push('-waddir', wadDirPath);
      }

      await this.fileManager.launchOdamex(args);
    } catch (error) {
      console.error('Failed to launch Odamex:', error);
    }
  }
}
