import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SettingsCardComponent } from '@shared/components';
import { LocalNetworkDiscoveryService, DialogService, DialogPresets } from '@shared/services';
import { LocalDiscoveryDialogComponent } from '@core/local-discovery-dialog/local-discovery-dialog.component';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-network-settings',
  imports: [FormsModule, DatePipe, SettingsCardComponent],
  templateUrl: './network-settings.component.html',
  styleUrls: ['./network-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NetworkSettingsComponent {
  private localNetworkDiscoveryService = inject(LocalNetworkDiscoveryService);
  private dialogService = inject(DialogService);

  // Local Network Discovery settings (computed from service)
  localDiscoveryEnabled = computed(() => this.localNetworkDiscoveryService.settings().enabled);
  localDiscoveryPortStart = computed(() => this.localNetworkDiscoveryService.settings().portRangeStart);
  localDiscoveryPortEnd = computed(() => this.localNetworkDiscoveryService.settings().portRangeEnd);
  localDiscoveryScanTimeout = computed(() => this.localNetworkDiscoveryService.settings().scanTimeout);
  localDiscoveryRefreshInterval = computed(() => this.localNetworkDiscoveryService.settings().refreshInterval);
  localDiscoveryMaxConcurrent = computed(() => this.localNetworkDiscoveryService.settings().maxConcurrent);
  localDiscoveryScanning = computed(() => this.localNetworkDiscoveryService.scanning());
  localDiscoveryLastScan = computed(() => this.localNetworkDiscoveryService.lastScanTime());
  localDiscoveryNetworks = computed(() => this.localNetworkDiscoveryService.detectedNetworks());
  
  // UI state for advanced settings
  showAdvancedDiscovery = signal(false);
  private localDiscoveryModalRef: NgbModalRef | null = null;

  /**
   * Toggle local network discovery
   */
  toggleLocalDiscovery(): void {
    const current = this.localNetworkDiscoveryService.settings();
    const newEnabled = !current.enabled;
    
    // Check if this is the first time enabling
    const hasSeenDialog = localStorage.getItem('localDiscoveryDialogShown') === 'true';
    
    if (newEnabled && !hasSeenDialog) {
      // Show confirmation dialog on first enable
      this.localDiscoveryModalRef = this.dialogService.open(LocalDiscoveryDialogComponent, {
        ...DialogPresets.standard(),
        size: 'lg',
        modalDialogClass: 'odx-modal'
      });
      
      // Wait for user to confirm or cancel
      this.localDiscoveryModalRef.result.then(
        () => this.confirmLocalDiscovery(),
        () => this.cancelLocalDiscovery()
      );
    } else {
      // Just toggle normally
      this.localNetworkDiscoveryService.updateSettings({ enabled: newEnabled });
      
      if (newEnabled) {
        this.localNetworkDiscoveryService.start();
      } else {
        this.localNetworkDiscoveryService.stop();
      }
    }
  }
  
  /**
   * Confirm local discovery (after dialog)
   */
  confirmLocalDiscovery(): void {
    // Mark that user has seen the dialog
    localStorage.setItem('localDiscoveryDialogShown', 'true');
    
    // Enable and start scanning
    this.localNetworkDiscoveryService.updateSettings({ enabled: true });
    this.localNetworkDiscoveryService.start();
  }
  
  /**
   * Cancel local discovery (dialog dismissed)
   */
  cancelLocalDiscovery(): void {
    // Dialog already closed via dismiss, nothing to do
  }

  /**
   * Toggle advanced discovery settings visibility
   */
  toggleAdvancedDiscovery(): void {
    this.showAdvancedDiscovery.set(!this.showAdvancedDiscovery());
  }

  /**
   * Update port range start
   */
  updatePortRangeStart(port: number): void {
    if (port >= 1024 && port <= 65535) {
      this.localNetworkDiscoveryService.updateSettings({ portRangeStart: port });
      this.localNetworkDiscoveryService.restart();
    }
  }

  /**
   * Update port range end
   */
  updatePortRangeEnd(port: number): void {
    if (port >= 1024 && port <= 65535) {
      this.localNetworkDiscoveryService.updateSettings({ portRangeEnd: port });
      this.localNetworkDiscoveryService.restart();
    }
  }

  /**
   * Update scan timeout
   */
  updateScanTimeout(timeout: number): void {
    if (timeout >= 50 && timeout <= 5000) {
      this.localNetworkDiscoveryService.updateSettings({ scanTimeout: timeout });
      this.localNetworkDiscoveryService.restart();
    }
  }

  /**
   * Update refresh interval
   */
  updateRefreshInterval(seconds: number): void {
    if (seconds >= 10 && seconds <= 600) {
      this.localNetworkDiscoveryService.updateSettings({ refreshInterval: seconds });
      this.localNetworkDiscoveryService.restart();
    }
  }

  /**
   * Update max concurrent scans
   */
  updateMaxConcurrent(max: number): void {
    if (max >= 1 && max <= 200) {
      this.localNetworkDiscoveryService.updateSettings({ maxConcurrent: max });
      this.localNetworkDiscoveryService.restart();
    }
  }

  /**
   * Toggle whether a specific network is enabled for scanning
   */
  toggleNetwork(cidr: string): void {
    this.localNetworkDiscoveryService.toggleNetwork(cidr);
  }

  /**
   * Trigger a manual local network scan
   */
  triggerLocalScan(): void {
    this.localNetworkDiscoveryService.scan(true); // Force scan even if disabled
  }
}
