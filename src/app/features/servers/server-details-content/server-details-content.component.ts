import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OdalPapi } from '@shared/services';

/**
 * Shared component for displaying server details content.
 * Used by both bottom and right panel layouts in the server browser.
 * Provides a DRY approach to rendering server information, player lists, and join functionality.
 */
@Component({
  selector: 'app-server-details-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './server-details-content.component.html',
  styleUrl: './server-details-content.component.scss',
})
export class ServerDetailsContentComponent {
  /** The server to display details for */
  server = input.required<OdalPapi.ServerInfo | null>();
  
  /** Whether a join operation is currently in progress */
  joiningServer = input<boolean>(false);
  
  /** Emits when the join button is clicked */
  joinServerClick = output<OdalPapi.ServerInfo>();
  
  /** Helper function to get game type display name */
  getGameTypeName = input.required<(gameType: OdalPapi.GameType) => string>();
  
  /** Helper function to get CSS class for ping value */
  getPingClass = input.required<(ping: number) => string>();
  
  /** Helper function to get list of PWADs for a server */
  getServerPWADs = input.required<(server: OdalPapi.ServerInfo) => string[]>();
  
  /**
   * Handles the join button click event.
   * Emits the server info to the parent component.
   */
  onJoinClick() {
    if (this.server()) {
      this.joinServerClick.emit(this.server()!);
    }
  }
}
