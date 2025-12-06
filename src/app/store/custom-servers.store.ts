import { Injectable } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { OdalPapi } from '@shared/services';

/**
 * Represents a custom server address with its display order
 */
export interface CustomServerAddress {
  /** The server address in format IP:port or domain:port */
  address: string;
  /** Display order in the list */
  order: number;
}

/**
 * State for custom server management
 */
interface CustomServersState {
  /** List of custom server addresses */
  addresses: CustomServerAddress[];
  /** Queried server information */
  servers: OdalPapi.ServerInfo[];
  /** Whether servers are currently being queried */
  loading: boolean;
}

const STORAGE_KEY = 'customServerAddresses';

/**
 * Loads custom server addresses from localStorage
 */
function loadAddressesFromStorage(): CustomServerAddress[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load custom servers from localStorage:', error);
  }
  return [];
}

/**
 * Saves custom server addresses to localStorage
 */
function saveAddressesToStorage(addresses: CustomServerAddress[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
  } catch (error) {
    console.error('Failed to save custom servers to localStorage:', error);
  }
}

const initialState: CustomServersState = {
  addresses: loadAddressesFromStorage(),
  servers: [],
  loading: false
};

/**
 * Signal store for managing custom server addresses and their queried data.
 * Persists addresses to localStorage and provides methods for CRUD operations.
 */
export const CustomServersStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    /**
     * Adds a new custom server address to the list
     * @param address Server address in format IP:port or domain:port
     */
    addAddress(address: string) {
      const addresses = store.addresses();
      const maxOrder = addresses.length > 0 
        ? Math.max(...addresses.map(a => a.order))
        : -1;
      
      const newAddresses = [...addresses, { address, order: maxOrder + 1 }];
      patchState(store, { addresses: newAddresses });
      saveAddressesToStorage(newAddresses);
    },
    
    /**
     * Removes a custom server address from the list
     * @param address Server address to remove
     */
    removeAddress(address: string) {
      const newAddresses = store.addresses().filter(a => a.address !== address);
      patchState(store, { addresses: newAddresses });
      saveAddressesToStorage(newAddresses);
    },
    
    /**
     * Updates an existing custom server address
     * @param oldAddress Current server address
     * @param newAddress New server address
     */
    updateAddress(oldAddress: string, newAddress: string) {
      const addresses = store.addresses();
      const index = addresses.findIndex(a => a.address === oldAddress);
      if (index !== -1) {
        const newAddresses = [...addresses];
        newAddresses[index] = { ...newAddresses[index], address: newAddress };
        patchState(store, { addresses: newAddresses });
        saveAddressesToStorage(newAddresses);
      }
    },
    
    /**
     * Reorders the custom server addresses list
     * @param addresses New ordered list of addresses
     */
    reorderAddresses(addresses: CustomServerAddress[]) {
      // Ensure order values are correct
      const reorderedAddresses = addresses.map((addr, index) => ({
        ...addr,
        order: index
      }));
      patchState(store, { addresses: reorderedAddresses });
      saveAddressesToStorage(reorderedAddresses);
    },
    
    /**
     * Updates the queried server information
     * @param servers List of queried server data
     */
    setServers(servers: OdalPapi.ServerInfo[]) {
      patchState(store, { servers, loading: false });
    },
    
    /**
     * Sets the loading state
     * @param loading Whether servers are being queried
     */
    setLoading(loading: boolean) {
      patchState(store, { loading });
    },
    
    /**
     * Resets the store state while preserving saved addresses
     */
    reset() {
      patchState(store, { ...initialState, addresses: store.addresses() });
    }
  }))
);
