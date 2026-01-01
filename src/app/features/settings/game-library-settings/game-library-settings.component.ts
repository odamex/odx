import { Component, ChangeDetectionStrategy, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { SettingsCardComponent } from '@shared/components';
import { IWADService, type GameMetadata, ControllerService, SettingsFormControllerService, ControllerEvent } from '@shared/services';
import { GameSelectionDialogComponent } from '@core/game-selection-dialog/game-selection-dialog.component';

@Component({
  selector: 'app-game-library-settings',
  imports: [GameSelectionDialogComponent, SettingsCardComponent],
  templateUrl: './game-library-settings.component.html',
  styleUrls: ['./game-library-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SettingsFormControllerService]
})
export class GameLibrarySettingsComponent implements OnInit, OnDestroy {
  protected iwadService = inject(IWADService);
  private controllerService = inject(ControllerService);
  private formControllerService = inject(SettingsFormControllerService);
  private controllerSubscription: (() => void) | null = null;

  // Computed properties for IWAD grouping
  readonly groupedIWADs = computed(() => {
    const displayGames = this.iwadService.displayGames();
    const groups = new Map<string, { metadata: GameMetadata | undefined, iwads: typeof displayGames, count: number, hasID24: boolean, versions: Set<string>, hasLatest: boolean }>();
    
    for (const game of displayGames) {
      const gameType = game.entry.game;
      // Create separate groups for ID24 and non-ID24 versions
      const groupKey = game.entry.id24 ? `${gameType}_id24` : gameType;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          metadata: this.getGameMetadata(gameType),
          iwads: [],
          count: 0,
          hasID24: game.entry.id24 || false,
          versions: new Set<string>(),
          hasLatest: false
        });
      }
      const group = groups.get(groupKey)!;
      
      // Extract version from IWAD name (e.g., "v1.9", "Oct 2024", "v0.12.1")
      const versionMatch = game.entry.name.match(/v?\d+\.\d+(?:\.\d+)?|(?:Oct|October|Nov|November|Dec|December)\s+\d{4}|BFG Edition|Unity|Classic/i);
      if (versionMatch) {
        group.versions.add(versionMatch[0]);
      }
      
      // Check if this group has the latest version
      if (game.entry.isLatest) {
        group.hasLatest = true;
      }
      
      // Only add to iwads array if it's an actual detected file (has a path)
      if (game.path) {
        group.iwads.push(game);
        if (game.entry.id24) {
          group.hasID24 = true;
        }
      }
      group.count = game.detectedCount || 0;
    }
    
    const result = Array.from(groups.values()).filter(g => g.metadata).map(g => ({
      ...g,
      versionsArray: Array.from(g.versions)
    }));
    return result;
  });
  
  readonly commercialGames = computed(() => {
    return this.groupedIWADs()
      .filter(g => g.metadata?.commercial && g.count > 0)
      .sort((a, b) => (a.metadata?.displayName || '').localeCompare(b.metadata?.displayName || ''));
  });
  
  readonly freeGames = computed(() => {
    return this.groupedIWADs()
      .filter(g => !g.metadata?.commercial)
      .sort((a, b) => (a.metadata?.displayName || '').localeCompare(b.metadata?.displayName || ''));
  });

  readonly detectedIWADs = computed(() => {
    return this.iwadService.displayGames().filter(g => g.path);
  });

  showGameSelection = signal(false);

  ngOnInit() {
    this.controllerSubscription = this.controllerService.addEventListener((event: ControllerEvent) => {
      if (event.type === 'buttonpress' && event.button !== undefined) {
        this.formControllerService.handleButtonPress(event);
      } else if (event.type === 'direction') {
        this.formControllerService.handleDirection(event);
      }
    });
  }

  ngOnDestroy() {
    this.controllerSubscription?.();
  }

  /**
   * Get game metadata by type
   */
  getGameMetadata(gameType: string): GameMetadata | undefined {
    return this.iwadService.gameMetadata()[gameType];
  }

  /**
   * Open the game selection dialog
   */
  openGameSelection() {
    this.showGameSelection.set(true);
  }

  /**
   * Add a new WAD directory
   */
  async addDirectory() {
    try {
      const directory = await window.electron.fileManager.pickDirectory();
      if (directory) {
        await this.iwadService.addWADDirectory(directory);
        await this.iwadService.detectIWADs(); // Rescan after adding
      }
    } catch (err: any) {
      console.error('Failed to add directory:', err);
      alert(`Failed to add directory: ${err.message || err}`);
    }
  }

  /**
   * Handle game selection completion
   */
  async onGameSelectionComplete() {
    this.showGameSelection.set(false);
    // Rescan for IWADs
    await this.iwadService.detectIWADs();
    await this.iwadService.getWADDirectories();
  }

  /**
   * Handle game selection cancellation
   */
  onGameSelectionCancel() {
    this.showGameSelection.set(false);
  }

  /**
   * Remove a WAD directory
   */
  async removeWADDirectory(directory: string) {
    if (confirm(`Remove directory "${directory}" from WAD search paths?`)) {
      try {
        await this.iwadService.removeWADDirectory(directory);
        await this.iwadService.detectIWADs(); // Rescan after removal
      } catch (err) {
        console.error('Failed to remove directory:', err);
        alert('Failed to remove directory. Please try again.');
      }
    }
  }

  /**
   * Toggle recursive scanning for a directory
   */
  async toggleRecursiveScan(directory: string, recursive: boolean) {
    try {
      await this.iwadService.toggleRecursiveScan(directory, recursive);
      await this.iwadService.detectIWADs(); // Rescan after changing recursive setting
    } catch (err) {
      console.error('Failed to toggle recursive scan:', err);
      alert('Failed to update recursive scan setting. Please try again.');
    }
  }

  /**
   * Rescan all IWAD directories
   */
  async rescanIWADs() {
    try {
      await this.iwadService.rescanIWADs();
    } catch (err) {
      console.error('Failed to rescan IWADs:', err);
      alert('Failed to rescan IWADs. Please try again.');
    }
  }

  /**
   * Toggle Steam scan
   */
  async toggleSteamScan(event: Event) {
    const enabled = (event.target as HTMLInputElement).checked;
    try {
      await this.iwadService.setSteamScan(enabled);
      await this.iwadService.detectIWADs(); // Rescan after toggling
    } catch (err) {
      console.error('Failed to toggle Steam scan:', err);
      alert('Failed to update Steam scan setting. Please try again.');
    }
  }
}
