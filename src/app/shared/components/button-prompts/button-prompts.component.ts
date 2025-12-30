import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { bootstrapDpadFill } from '@ng-icons/bootstrap-icons';
import { ControllerService, ControllerFocusService, AppSettingsService, GamepadButton, ControllerEvent } from '@shared/services';

interface ButtonPrompt {
  button: GamepadButton | 'dpad';
  action: string;
}

@Component({
  selector: 'app-button-prompts',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './button-prompts.component.html',
  styleUrls: ['./button-prompts.component.scss'],
  providers: [provideIcons({ bootstrapDpadFill })]
})
export class ButtonPromptsComponent implements OnInit, OnDestroy {
  private controllerService = inject(ControllerService);
  private focusService = inject(ControllerFocusService);
  private appSettings = inject(AppSettingsService);

  private lastActivity = signal(Date.now());
  private currentTime = signal(Date.now());
  private timeInterval?: number;
  private controllerUnsubscribe?: () => void;
  private isFaded = false;
  
  // Cache visibility state to prevent flicker
  private cachedVisibility = signal(true);

  protected shouldShow = computed(() => this.cachedVisibility());

  protected opacity = computed(() => {
    const elapsed = this.currentTime() - this.lastActivity();
    const shouldBeFaded = elapsed >= 5000;
    
    // Stop the timer once we've faded out
    if (shouldBeFaded && !this.isFaded) {
      this.stopTimer();
      this.isFaded = true;
    }
    
    return shouldBeFaded ? 0 : 1;
  });

  protected prompts = computed<ButtonPrompt[]>(() => {
    const inContent = this.focusService.focusArea() === 'content';
    const elementType = this.focusService.focusedElementType();
    
    if (inContent) {
      const prompts: ButtonPrompt[] = [
        { button: 'dpad' as const, action: 'Navigate' }
      ];
      
      // Add contextual prompts based on focused element type
      switch (elementType) {
        case 'checkbox':
          prompts.push({ button: GamepadButton.A, action: 'Toggle' });
          break;
        case 'numeric':
        case 'range':
          prompts.push({ button: GamepadButton.Y, action: 'Increase' });
          prompts.push({ button: GamepadButton.X, action: 'Decrease' });
          break;
        case 'select':
          prompts.push({ button: GamepadButton.A, action: 'Open' });
          break;
        case 'button':
          prompts.push({ button: GamepadButton.A, action: 'Activate' });
          break;
        default:
          prompts.push({ button: GamepadButton.A, action: 'Select' });
          break;
      }
      
      prompts.push({ button: GamepadButton.B, action: 'Back' });
      return prompts;
    } else {
      return [
        { button: 'dpad' as const, action: 'Navigate' },
        { button: GamepadButton.A, action: 'Select' }
      ];
    }
  });

  ngOnInit(): void {
    // Set initial visibility
    this.updateVisibility();
    
    this.controllerUnsubscribe = this.controllerService.addEventListener((event: ControllerEvent) => {
      // Update visibility on connection changes
      if (event.type === 'connected' || event.type === 'disconnected') {
        this.updateVisibility();
      }
      
      if (event.type === 'buttonpress' || event.type === 'direction') {
        this.lastActivity.set(Date.now());
        
        // Restart timer when there's activity if we were faded
        if (this.isFaded) {
          this.isFaded = false;
          this.startTimer();
        }
      }
    });

    this.startTimer();
  }

  private updateVisibility(): void {
    const visible = (
      this.controllerService.connected() &&
      this.controllerService.enabled() &&
      this.appSettings.controllerShowButtonPrompts()
    );
    this.cachedVisibility.set(visible);
  }

  private startTimer(): void {
    if (this.timeInterval) return; // Already running
    
    this.timeInterval = window.setInterval(() => {
      this.currentTime.set(Date.now());
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
      this.timeInterval = undefined;
    }
  }

  ngOnDestroy(): void {
    this.controllerUnsubscribe?.();
    this.stopTimer();
  }

  protected getButtonLabel(button: GamepadButton | 'dpad'): string {
    if (button === 'dpad') {
      return 'D-pad';
    }
    return this.controllerService.getButtonName(button);
  }

  protected getButtonClass(button: GamepadButton): string {
    const schema = this.controllerService.schema();
    const baseClass = 'btn-';
    
    switch (schema) {
      case 'xbox':
        // Xbox colors: A=green, B=red, X=blue, Y=yellow
        if (button === GamepadButton.A) return baseClass + 'xbox-a';
        if (button === GamepadButton.B) return baseClass + 'xbox-b';
        if (button === GamepadButton.X) return baseClass + 'xbox-x';
        if (button === GamepadButton.Y) return baseClass + 'xbox-y';
        break;
      case 'playstation':
        // PlayStation colors: Cross=blue, Circle=red, Square=pink, Triangle=green
        if (button === GamepadButton.A) return baseClass + 'ps-cross';
        if (button === GamepadButton.B) return baseClass + 'ps-circle';
        if (button === GamepadButton.X) return baseClass + 'ps-square';
        if (button === GamepadButton.Y) return baseClass + 'ps-triangle';
        break;
      case 'nintendo':
        // Nintendo colors: B=green, A=red, Y=blue, X=yellow
        if (button === GamepadButton.A) return baseClass + 'nintendo-b';
        if (button === GamepadButton.B) return baseClass + 'nintendo-a';
        if (button === GamepadButton.X) return baseClass + 'nintendo-y';
        if (button === GamepadButton.Y) return baseClass + 'nintendo-x';
        break;
    }
    
    return baseClass + 'generic';
  }

  protected getButtonSymbol(button: GamepadButton): string {
    const schema = this.controllerService.schema();
    
    switch (schema) {
      case 'xbox':
        if (button === GamepadButton.A) return 'A';
        if (button === GamepadButton.B) return 'B';
        if (button === GamepadButton.X) return 'X';
        if (button === GamepadButton.Y) return 'Y';
        break;
      case 'playstation':
        if (button === GamepadButton.A) return '✕';
        if (button === GamepadButton.B) return '◯';
        if (button === GamepadButton.X) return '☐';
        if (button === GamepadButton.Y) return '△';
        break;
      case 'nintendo':
        if (button === GamepadButton.A) return 'B';
        if (button === GamepadButton.B) return 'A';
        if (button === GamepadButton.X) return 'Y';
        if (button === GamepadButton.Y) return 'X';
        break;
    }
    
    return this.controllerService.getButtonName(button);
  }
}
