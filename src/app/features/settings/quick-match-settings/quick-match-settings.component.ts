import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, ElementRef, AfterViewInit, input, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsCardComponent } from '@shared/components';
import { 
  QuickMatchService, 
  OdalPapi, 
  type QuickMatchCriteria,
  ControllerService,
  ControllerFocusService,
  SettingsFormControllerService,
  GamepadButton
} from '@shared/services';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-quick-match-settings',
  imports: [FormsModule, SettingsCardComponent],
  templateUrl: './quick-match-settings.component.html',
  styleUrls: ['./quick-match-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SettingsFormControllerService]
})
export class QuickMatchSettingsComponent implements OnInit, OnDestroy, AfterViewInit {
  private quickMatchService = inject(QuickMatchService);
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

  // Quick Match settings
  quickMatchCriteria: QuickMatchCriteria = {
    maxPing: 100,
    minPlayers: 1,
    maxPlayers: 32,
    avoidEmpty: true,
    avoidFull: true,
    monitoringTimeoutMinutes: 60,
    autoStartMonitoring: true,
    preferredGameTypes: [
      OdalPapi.GameType.GT_Deathmatch,
      OdalPapi.GameType.GT_TeamDeathmatch,
      OdalPapi.GameType.GT_CaptureTheFlag,
      OdalPapi.GameType.GT_Cooperative,
      OdalPapi.GameType.GT_Survival,
      OdalPapi.GameType.GT_Horde
    ]
  };

  ngOnInit() {
    // Load Quick Match settings from localStorage
    const savedQuickMatchCriteria = localStorage.getItem('quickMatchCriteria');
    if (savedQuickMatchCriteria) {
      try {
        const criteria = JSON.parse(savedQuickMatchCriteria);
        this.quickMatchCriteria = criteria;
        this.quickMatchService.criteria.set(criteria);
      } catch (err) {
        console.error('Failed to load Quick Match settings:', err);
      }
    } else {
      // Initialize service with default criteria
      this.quickMatchService.criteria.set({ ...this.quickMatchCriteria });
    }

    // Subscribe to controller events
    const removeListener = this.controllerService.addEventListener((event) => {
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

  /**
   * Check if a game type is selected in Quick Match preferences
   */
  isGameTypeSelected(gameType: OdalPapi.GameType): boolean {
    return this.quickMatchCriteria.preferredGameTypes?.includes(gameType) ?? false;
  }

  /**
   * Toggle a game type in Quick Match preferences
   */
  toggleGameType(gameType: OdalPapi.GameType): void {
    if (!this.quickMatchCriteria.preferredGameTypes) {
      this.quickMatchCriteria.preferredGameTypes = [];
    }

    const index = this.quickMatchCriteria.preferredGameTypes.indexOf(gameType);
    if (index > -1) {
      this.quickMatchCriteria.preferredGameTypes.splice(index, 1);
    } else {
      this.quickMatchCriteria.preferredGameTypes.push(gameType);
    }
    
    this.saveQuickMatchSettings();
  }

  /**
   * Save Quick Match settings (auto-save on change)
   */
  saveQuickMatchSettings(): void {
    try {
      // Update the service with new criteria
      this.quickMatchService.criteria.set({ ...this.quickMatchCriteria });
      
      // Persist to localStorage
      localStorage.setItem('quickMatchCriteria', JSON.stringify(this.quickMatchCriteria));
    } catch (err) {
      console.error('Failed to save Quick Match settings:', err);
    }
  }

  /**
   * Reset Quick Match settings to defaults
   */
  resetQuickMatchSettings(): void {
    this.quickMatchCriteria = {
      maxPing: 100,
      minPlayers: 1,
      maxPlayers: 32,
      avoidEmpty: true,
      avoidFull: true,
      monitoringTimeoutMinutes: 60,
      autoStartMonitoring: true,
      preferredGameTypes: [
        OdalPapi.GameType.GT_Deathmatch,
        OdalPapi.GameType.GT_TeamDeathmatch,
        OdalPapi.GameType.GT_CaptureTheFlag,
        OdalPapi.GameType.GT_Cooperative,
        OdalPapi.GameType.GT_Survival,
        OdalPapi.GameType.GT_Horde
      ]
    };
    
    // Also reset in service and localStorage
    this.quickMatchService.criteria.set({ ...this.quickMatchCriteria });
    localStorage.removeItem('quickMatchCriteria');
    
    // Save the defaults
    this.saveQuickMatchSettings();
  }
}
