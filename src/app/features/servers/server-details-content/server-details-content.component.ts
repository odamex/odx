import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OdalPapi } from '@shared/services';

@Component({
  selector: 'app-server-details-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './server-details-content.component.html',
  styleUrl: './server-details-content.component.scss',
})
export class ServerDetailsContentComponent {
  // Inputs
  server = input.required<OdalPapi.ServerInfo | null>();
  joiningServer = input<boolean>(false);
  
  // Outputs
  joinServerClick = output<OdalPapi.ServerInfo>();
  
  // Methods passed as inputs
  getGameTypeName = input.required<(gameType: OdalPapi.GameType) => string>();
  getPingClass = input.required<(ping: number) => string>();
  getServerPWADs = input.required<(server: OdalPapi.ServerInfo) => string[]>();
  
  onJoinClick() {
    if (this.server()) {
      this.joinServerClick.emit(this.server()!);
    }
  }
}
