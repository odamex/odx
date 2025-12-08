import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuickMatchService, OdalPapi, type QuickMatchCriteria } from '@shared/services';

@Component({
  selector: 'app-quick-match-settings',
  imports: [FormsModule],
  templateUrl: './quick-match-settings.component.html',
  styleUrls: ['./quick-match-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickMatchSettingsComponent implements OnInit {
  private quickMatchService = inject(QuickMatchService);

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
