import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  bootstrapDash,
  bootstrapSquare,
  bootstrapX,
  bootstrapWifi,
  bootstrapWifiOff,
  bootstrapCircleFill
} from '@ng-icons/bootstrap-icons';
import { NetworkStatusService, OdamexServiceStatusService } from '@shared/services';

/**
 * Custom title bar component with window controls and network status indicator
 * 
 * Provides minimize, maximize, and close buttons for Electron window control.
 * Displays a WiFi icon showing current network connectivity status.
 */
@Component({
  selector: 'app-title-bar',
  imports: [NgIconComponent],
  viewProviders: [provideIcons({ bootstrapDash, bootstrapSquare, bootstrapX, bootstrapWifi, bootstrapWifiOff, bootstrapCircleFill })],
  templateUrl: './title-bar.component.html',
  styleUrls: ['./title-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TitleBarComponent {
  private networkStatus = inject(NetworkStatusService);
  private serviceStatus = inject(OdamexServiceStatusService);
  
  protected readonly appTitle = signal('ODX');
  protected readonly isOnline = this.networkStatus.isOnline;
  protected readonly connectionStatus = this.serviceStatus.connectionStatus;
  protected readonly platform = signal<string>(window.electron?.platform || 'unknown');
  protected readonly showWindowControls = signal(this.platform() === 'win32' || this.platform() === 'linux');

  /**
   * Minimize the application window
   */
  protected onMinimize(): void {
    if (window.electron) {
      window.electron.minimizeWindow();
    }
  }

  /**
   * Maximize or restore the application window
   */
  protected onMaximize(): void {
    if (window.electron) {
      window.electron.maximizeWindow();
    }
  }

  /**
   * Close the application window
   */
  protected onClose(): void {
    if (window.electron) {
      window.electron.closeWindow();
    }
  }
}
