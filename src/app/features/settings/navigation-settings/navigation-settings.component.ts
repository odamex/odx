import { Component, ChangeDetectionStrategy, computed, inject, OnInit, OnDestroy, ElementRef, AfterViewInit, input, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsCardComponent } from '@shared/components';
import { 
  AppSettingsService, 
  ControllerService, 
  ControllerFocusService,
  SettingsFormControllerService,
  GamepadButton,
  type ControllerEvent 
} from '@shared/services';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navigation-settings',
  imports: [CommonModule, FormsModule, SettingsCardComponent],
  templateUrl: './navigation-settings.component.html',
  styleUrls: ['./navigation-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SettingsFormControllerService]
})
export class NavigationSettingsComponent implements OnInit, OnDestroy, AfterViewInit {
  private appSettings = inject(AppSettingsService);
  private controllerService = inject(ControllerService);
  private focusService = inject(ControllerFocusService);
  private formController = inject(SettingsFormControllerService);
  private elementRef = inject(ElementRef);
  private controllerSubscription?: Subscription;
  
  // Track when we just entered content mode to avoid processing the same A button press
  private justEnteredContent = false;
  
  // Only process button presses after explicitly entering content mode
  private canProcessButtons = false;
  
  // Input from parent to know when parent is in content mode
  parentNavigationState = input.required<Signal<'tabs' | 'content'>>();

  // Controller settings (computed from services)
  controllerEnabled = computed(() => this.appSettings.controllerEnabled());
  controllerSchema = computed(() => this.appSettings.controllerSchema());
  controllerDeadzone = computed(() => this.appSettings.controllerDeadzone());
  controllerShowButtonPrompts = computed(() => this.appSettings.controllerShowButtonPrompts());
  controllerConnected = computed(() => this.controllerService.connected());
  controllerName = computed(() => this.controllerService.controllerName());

  ngOnInit(): void {
    // Subscribe to controller events
    const removeListener = this.controllerService.addEventListener((event: ControllerEvent) => {
      // Only handle events when we have content focus
      if (!this.focusService.hasFocus('content')) return;

      if (event.type === 'direction') {
        this.formController.handleDirection(event);
      } else if (event.type === 'buttonpress') {
        // Only process button presses after we've explicitly entered content mode
        if (!this.canProcessButtons) {
          return;
        }
        this.formController.handleButtonPress(event);
      }
    });
    
    // Store cleanup function
    this.controllerSubscription = { unsubscribe: removeListener } as any;
    
    // Listen for parent telling us to enter content mode
    window.addEventListener('settingsEnterContent', this.onEnterContent);
    window.addEventListener('settingsExitContent', this.onExitContent);
  }
  
  private onEnterContent = () => {
    // Set flag to ignore the A button that triggered this entry
    this.justEnteredContent = true;
    
    // Enable button processing now that we're in content mode
    this.canProcessButtons = true;
    
    // Focus first control when entering this tab's content
    this.formController.focusFirst();
    
    // Clear the flag after a short delay
    setTimeout(() => {
      this.justEnteredContent = false;
    }, 200);
  };
  
  private onExitContent = () => {
    // Disable button processing when exiting content mode
    this.canProcessButtons = false;
    this.formController.cleanup();
  };

  ngAfterViewInit(): void {
    // Find and setup focusable elements
    setTimeout(() => {
      this.formController.findFocusableElements(this.elementRef);
    }, 150);
  }

  ngOnDestroy(): void {
    this.controllerSubscription?.unsubscribe();
    this.formController.cleanup();
    window.removeEventListener('settingsEnterContent', this.onEnterContent);
    window.removeEventListener('settingsExitContent', this.onExitContent);
  }

  // Controller settings methods
  toggleControllerEnabled() {
    this.appSettings.setControllerEnabled(!this.controllerEnabled());
  }

  onControllerSchemaChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.appSettings.setControllerSchema(select.value as any);
  }

  onControllerDeadzoneChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const deadzone = parseFloat(input.value);
    this.appSettings.setControllerDeadzone(deadzone);
  }

  toggleControllerShowButtonPrompts() {
    this.appSettings.setControllerShowButtonPrompts(!this.controllerShowButtonPrompts());
  }
}
