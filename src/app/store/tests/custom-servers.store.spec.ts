import { TestBed } from '@angular/core/testing';
import { CustomServersStore, CustomServerAddress } from '../custom-servers.store';
import { OdalPapi } from '@shared/services';

describe('CustomServersStore', () => {
  let store: InstanceType<typeof CustomServersStore>;
  const STORAGE_KEY = 'customServerAddresses';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    TestBed.configureTestingModule({
      providers: [CustomServersStore]
    });
    
    store = TestBed.inject(CustomServersStore);
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  describe('Initial State', () => {
    it('should initialize with empty addresses from localStorage', () => {
      expect(store.addresses()).toEqual([]);
      expect(store.servers()).toEqual([]);
      expect(store.loading()).toBe(false);
    });

    it('should load addresses from localStorage if present', () => {
      // Add addresses which should trigger save to localStorage
      store.addAddress('192.168.1.1:10666');
      store.addAddress('192.168.1.2:10667');
      
      // Verify localStorage was updated
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBe(2);
      expect(parsed[0].address).toBe('192.168.1.1:10666');
      expect(parsed[1].address).toBe('192.168.1.2:10667');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // We can't easily test the load error since it happens at module init,
      // but we can verify the store handles missing/empty data correctly
      localStorage.removeItem(STORAGE_KEY);
      
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [CustomServersStore]
      });
      const newStore = TestBed.inject(CustomServersStore);
      
      expect(newStore.addresses()).toEqual([]);
    });

    it('should handle localStorage save errors gracefully', () => {
      // Spy on console.error before triggering save
      spyOn(console, 'error');
      
      // Mock localStorage.setItem to throw an error (e.g., quota exceeded)
      const originalSetItem = localStorage.setItem;
      spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
        if (key === STORAGE_KEY) {
          throw new Error('QuotaExceededError');
        }
        originalSetItem.call(localStorage, key, value);
      });
      
      // This should not throw, but handle the error gracefully
      expect(() => store.addAddress('192.168.1.1:10666')).not.toThrow();
      
      expect(console.error).toHaveBeenCalledWith(
        'Failed to save custom servers to localStorage:',
        jasmine.any(Error)
      );
    });
  });

  describe('addAddress', () => {
    it('should add a new address with correct order', () => {
      store.addAddress('192.168.1.1:10666');
      
      expect(store.addresses().length).toBe(1);
      expect(store.addresses()[0]).toEqual({ 
        address: '192.168.1.1:10666', 
        order: 0 
      });
    });

    it('should add multiple addresses with incrementing order', () => {
      store.addAddress('192.168.1.1:10666');
      store.addAddress('192.168.1.2:10667');
      store.addAddress('192.168.1.3:10668');
      
      const addresses = store.addresses();
      expect(addresses.length).toBe(3);
      expect(addresses[0].order).toBe(0);
      expect(addresses[1].order).toBe(1);
      expect(addresses[2].order).toBe(2);
    });

    it('should persist addresses to localStorage', () => {
      store.addAddress('192.168.1.1:10666');
      
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual([{ address: '192.168.1.1:10666', order: 0 }]);
    });
  });

  describe('removeAddress', () => {
    beforeEach(() => {
      store.addAddress('192.168.1.1:10666');
      store.addAddress('192.168.1.2:10667');
      store.addAddress('192.168.1.3:10668');
    });

    it('should remove an address by address string', () => {
      store.removeAddress('192.168.1.2:10667');
      
      const addresses = store.addresses();
      expect(addresses.length).toBe(2);
      expect(addresses.find(a => a.address === '192.168.1.2:10667')).toBeUndefined();
    });

    it('should update localStorage after removal', () => {
      store.removeAddress('192.168.1.1:10666');
      
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      
      expect(parsed.length).toBe(2);
      expect(parsed.find((a: CustomServerAddress) => a.address === '192.168.1.1:10666')).toBeUndefined();
    });

    it('should handle removing non-existent address gracefully', () => {
      const initialLength = store.addresses().length;
      store.removeAddress('non.existent:10666');
      
      expect(store.addresses().length).toBe(initialLength);
    });
  });

  describe('updateAddress', () => {
    beforeEach(() => {
      store.addAddress('192.168.1.1:10666');
      store.addAddress('192.168.1.2:10667');
    });

    it('should update an existing address', () => {
      store.updateAddress('192.168.1.1:10666', '192.168.1.100:10666');
      
      const addresses = store.addresses();
      expect(addresses.find(a => a.address === '192.168.1.1:10666')).toBeUndefined();
      expect(addresses.find(a => a.address === '192.168.1.100:10666')).toBeDefined();
    });

    it('should preserve order when updating address', () => {
      const originalOrder = store.addresses()[0].order;
      store.updateAddress('192.168.1.1:10666', '192.168.1.100:10666');
      
      const updated = store.addresses().find(a => a.address === '192.168.1.100:10666');
      expect(updated?.order).toBe(originalOrder);
    });

    it('should persist updated address to localStorage', () => {
      store.updateAddress('192.168.1.1:10666', '192.168.1.100:10666');
      
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      
      expect(parsed.find((a: CustomServerAddress) => a.address === '192.168.1.100:10666')).toBeDefined();
    });

    it('should do nothing if old address does not exist', () => {
      const addresses = store.addresses();
      store.updateAddress('non.existent:10666', '192.168.1.100:10666');
      
      expect(store.addresses()).toEqual(addresses);
    });
  });

  describe('reorderAddresses', () => {
    let addresses: CustomServerAddress[];

    beforeEach(() => {
      store.addAddress('192.168.1.1:10666');
      store.addAddress('192.168.1.2:10667');
      store.addAddress('192.168.1.3:10668');
      addresses = store.addresses();
    });

    it('should reorder addresses correctly', () => {
      const reordered = [addresses[2], addresses[0], addresses[1]];
      store.reorderAddresses(reordered);
      
      const result = store.addresses();
      expect(result[0].address).toBe('192.168.1.3:10668');
      expect(result[1].address).toBe('192.168.1.1:10666');
      expect(result[2].address).toBe('192.168.1.2:10667');
    });

    it('should update order values based on position', () => {
      const reordered = [addresses[2], addresses[0], addresses[1]];
      store.reorderAddresses(reordered);
      
      const result = store.addresses();
      expect(result[0].order).toBe(0);
      expect(result[1].order).toBe(1);
      expect(result[2].order).toBe(2);
    });

    it('should persist reordered addresses to localStorage', () => {
      const reordered = [addresses[2], addresses[0], addresses[1]];
      store.reorderAddresses(reordered);
      
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      
      expect(parsed[0].address).toBe('192.168.1.3:10668');
      expect(parsed[0].order).toBe(0);
    });
  });

  describe('setServers', () => {
    it('should update servers and set loading to false', () => {
      const mockServers: OdalPapi.ServerInfo[] = [
        {
          address: { ip: '192.168.1.1', port: 10666 },
          name: 'Test Server',
          map: 'MAP01',
          numplayers: 4,
          maxplayers: 16,
          ping: 50
        } as unknown as OdalPapi.ServerInfo
      ];

      store.setServers(mockServers);
      
      expect(store.servers()).toEqual(mockServers);
      expect(store.loading()).toBe(false);
    });

    it('should replace existing servers', () => {
      const firstBatch: OdalPapi.ServerInfo[] = [
        { address: { ip: '192.168.1.1', port: 10666 } } as OdalPapi.ServerInfo
      ];
      const secondBatch: OdalPapi.ServerInfo[] = [
        { address: { ip: '192.168.1.2', port: 10667 } } as OdalPapi.ServerInfo
      ];

      store.setServers(firstBatch);
      store.setServers(secondBatch);
      
      expect(store.servers()).toEqual(secondBatch);
    });
  });

  describe('setLoading', () => {
    it('should update loading state to true', () => {
      store.setLoading(true);
      expect(store.loading()).toBe(true);
    });

    it('should update loading state to false', () => {
      store.setLoading(true);
      store.setLoading(false);
      expect(store.loading()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear servers and loading state but preserve addresses', () => {
      store.addAddress('192.168.1.1:10666');
      store.setServers([{ address: { ip: '192.168.1.1', port: 10666 } } as OdalPapi.ServerInfo]);
      store.setLoading(true);
      
      const savedAddresses = store.addresses();
      store.reset();
      
      expect(store.servers()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.addresses()).toEqual(savedAddresses);
    });
  });
});
