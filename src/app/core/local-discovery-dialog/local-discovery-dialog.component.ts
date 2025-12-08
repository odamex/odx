import { Component, inject, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { LocalNetworkDiscoveryService } from '@shared/services/local-network-discovery/local-network-discovery.service';
import type { NetworkInterface } from '@shared/services/local-network-discovery/local-network-discovery.service';

/**
 * LocalDiscoveryDialogComponent
 * 
 * A confirmation dialog shown when the user first enables local network discovery.
 * Explains what the feature does and displays detected network interfaces.
 * Users can confirm to enable discovery or cancel to abort.
 */
@Component({
  selector: 'app-local-discovery-dialog',
  templateUrl: './local-discovery-dialog.component.html',
  styleUrl: './local-discovery-dialog.component.scss'
})
export class LocalDiscoveryDialogComponent implements OnInit {
  activeModal = inject(NgbActiveModal);
  private localNetworkDiscoveryService = inject(LocalNetworkDiscoveryService);
  
  networks: NetworkInterface[] = [];

  ngOnInit(): void {
    this.networks = this.localNetworkDiscoveryService.detectedNetworks();
  }

  confirm(): void {
    this.activeModal.close('confirmed');
  }

  cancel(): void {
    this.activeModal.dismiss('cancelled');
  }
}
