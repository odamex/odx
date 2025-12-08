import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CustomServersStore, CustomServerAddress } from '@app/store/custom-servers.store';
import { CustomServersService } from '@shared/services/custom-servers/custom-servers.service';
import { validateCustomServerAddress } from '@shared/utils/custom-server-validation';

/**
 * Modal component for managing custom server addresses.
 * Provides UI for adding, editing, removing, and reordering custom servers.
 * 
 * This component is opened via DialogService and uses NgbActiveModal for modal control.
 */
@Component({
  selector: 'app-custom-servers-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-servers-modal.component.html',
  styleUrl: './custom-servers-modal.component.scss'
})
export class CustomServersModalComponent {
  private store = inject(CustomServersStore);
  private customServersService = inject(CustomServersService);
  public activeModal = inject(NgbActiveModal);
  
  /** New address input value */
  newAddress = signal('');
  /** Index of the address being edited, null if not editing */
  editingIndex = signal<number | null>(null);
  /** Editing address input value */
  editingAddress = signal('');
  /** Current validation error message */
  validationError = signal<string | null>(null);
  
  /** List of addresses sorted by order */
  addresses = computed(() => {
    return [...this.store.addresses()].sort((a, b) => a.order - b.order);
  });
  
  /** Whether the current input can be saved */
  canSave = computed(() => {
    const addr = this.editingIndex() !== null ? this.editingAddress() : this.newAddress();
    if (!addr.trim()) return false;
    
    const validation = validateCustomServerAddress(addr);
    return validation.valid;
  });
  
  /**
   * Closes the modal and resets all input fields
   */
  close() {
    this.activeModal.close();
  }
  
  /**
   * Handles input changes and validates the address
   * @param value Input value
   * @param isEdit Whether this is for editing (true) or adding (false)
   */
  onInputChange(value: string, isEdit: boolean = false) {
    if (isEdit) {
      this.editingAddress.set(value);
    } else {
      this.newAddress.set(value);
    }
    
    // Clear previous error
    this.validationError.set(null);
    
    // Validate if not empty
    if (value.trim()) {
      const validation = validateCustomServerAddress(value);
      if (!validation.valid) {
        this.validationError.set(validation.error || 'Invalid address');
      }
    }
  }
  
  /**
   * Adds a new custom server address after validation
   */
  addServer() {
    const address = this.newAddress().trim();
    if (!address) return;
    
    const validation = validateCustomServerAddress(address);
    if (!validation.valid) {
      this.validationError.set(validation.error || 'Invalid address');
      return;
    }
    
    // Check for duplicates
    const addresses = this.store.addresses();
    if (addresses.some(a => a.address === address)) {
      this.validationError.set('This server is already in the list');
      return;
    }
    
    this.store.addAddress(address);
    this.newAddress.set('');
    this.validationError.set(null);
    
    // Query the newly added server
    this.customServersService.queryCustomServers();
  }
  
  /**
   * Enters edit mode for a server address
   * @param index Index of the address to edit
   */
  startEdit(index: number) {
    this.editingIndex.set(index);
    this.editingAddress.set(this.addresses()[index].address);
    this.validationError.set(null);
  }
  
  /**
   * Cancels the current edit operation
   */
  cancelEdit() {
    this.editingIndex.set(null);
    this.editingAddress.set('');
    this.validationError.set(null);
  }
  
  /**
   * Saves the edited server address after validation
   */
  saveEdit() {
    const index = this.editingIndex();
    if (index === null) return;
    
    const newAddr = this.editingAddress().trim();
    if (!newAddr) return;
    
    const validation = validateCustomServerAddress(newAddr);
    if (!validation.valid) {
      this.validationError.set(validation.error || 'Invalid address');
      return;
    }
    
    const oldAddr = this.addresses()[index].address;
    
    // Check for duplicates (excluding the current one)
    const addresses = this.store.addresses();
    if (addresses.some(a => a.address !== oldAddr && a.address === newAddr)) {
      this.validationError.set('This server is already in the list');
      return;
    }
    
    this.store.updateAddress(oldAddr, newAddr);
    this.editingIndex.set(null);
    this.editingAddress.set('');
    this.validationError.set(null);
    
    // Query the updated server
    this.customServersService.queryCustomServers();
  }
  
  /**
   * Removes a server address after confirmation
   * @param address Server address to remove
   */
  removeServer(address: string) {
    if (confirm(`Remove ${address} from custom servers?`)) {
      this.store.removeAddress(address);
      // Re-query to update the server list
      this.customServersService.queryCustomServers();
    }
  }
  
  /**
   * Moves a server address up in the list
   * @param index Index of the address to move
   */
  moveUp(index: number) {
    if (index === 0) return;
    
    const addresses = this.addresses();
    const newAddresses = [...addresses];
    [newAddresses[index - 1], newAddresses[index]] = [newAddresses[index], newAddresses[index - 1]];
    this.store.reorderAddresses(newAddresses);
  }
  
  /**
   * Moves a server address down in the list
   * @param index Index of the address to move
   */
  moveDown(index: number) {
    const addresses = this.addresses();
    if (index === addresses.length - 1) return;
    
    const newAddresses = [...addresses];
    [newAddresses[index], newAddresses[index + 1]] = [newAddresses[index + 1], newAddresses[index]];
    this.store.reorderAddresses(newAddresses);
  }
}
