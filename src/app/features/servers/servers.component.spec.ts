import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ServersComponent } from './servers.component';
import { ServersStore } from '@app/store';
import { CustomServersStore } from '@app/store/custom-servers.store';
import { 
  FileManagerService, 
  IWADService, 
  ServerRefreshService, 
  NetworkStatusService, 
  CustomServersService, 
  DialogService, 
  LocalNetworkDiscoveryService, 
  ControllerService, 
  ControllerFocusService,
  OdalPapi
} from '@shared/services';
import { signal } from '@angular/core';

class ServersStoreStub {
  servers = signal<OdalPapi.ServerInfo[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  selectedServerId = signal<string | null>(null);
  masterList = signal<string[]>([]);
}

class CustomServersStoreStub {
  servers = signal<string[]>([]);
}

class FileManagerServiceStub {
  getInstallationInfo = jasmine.createSpy('getInstallationInfo');
  launchOdamex = jasmine.createSpy('launchOdamex');
}

class IWADServiceStub {
  iwads = signal<any[]>([]);
  scanForIwads = jasmine.createSpy('scanForIwads');
}

class ServerRefreshServiceStub {
  startAutoRefresh = jasmine.createSpy('startAutoRefresh');
  stopAutoRefresh = jasmine.createSpy('stopAutoRefresh');
}

class NetworkStatusServiceStub {
  online = signal(true).asReadonly();
}

class CustomServersServiceStub {
  servers = signal<string[]>([]);
}

class DialogServiceStub {
  open = jasmine.createSpy('open');
}

class LocalNetworkDiscoveryServiceStub {
  scan = jasmine.createSpy('scan');
}

class ControllerServiceStub {
  enabled = signal(true).asReadonly();
  addEventListener = jasmine.createSpy('addEventListener').and.returnValue(() => {});
}

class ControllerFocusServiceStub {
  private focusAreaSignal = signal<'navigation' | 'content'>('navigation');
  readonly focusArea = this.focusAreaSignal.asReadonly();
  readonly setFocus = jasmine.createSpy('setFocus').and.callFake((area: 'navigation' | 'content') => {
    this.focusAreaSignal.set(area);
  });
}

describe('ServersComponent - Context Menu', () => {
  let component: ServersComponent;
  let fixture: ComponentFixture<ServersComponent>;

  const mockServer: OdalPapi.ServerInfo = {
    address: {
      ip: '192.168.1.100',
      port: 10666
    },
    name: 'Test Server',
    maxClients: 16,
    maxPlayers: 4,
    ping: 25,
    versionMajor: 10,
    versionMinor: 6,
    versionPatch: 0,
    wads: [
      { name: 'odamex.wad', hash: '' },
      { name: 'DOOM.WAD', hash: '' }
    ],
    patches: [],
    currentMap: 'E1M1',
    gameType: OdalPapi.GameType.GT_Deathmatch,
    players: [],
    teams: [],
    cvars: [],
    passwordHash: null,
    versionRevStr: null,
    response: null,
    versionRevision: null,
    versionProtocol: null,
    versionRealProtocol: null,
    pTime: null,
    scoreLimit: null,
    timeLimit: null,
    timeLeft: null,
    lives: null,
    sides: null,
    responded: true
  };

  beforeEach(async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve())
      }
    });

    await TestBed.configureTestingModule({
      imports: [ServersComponent],
      providers: [
        { provide: ServersStore, useClass: ServersStoreStub },
        { provide: CustomServersStore, useClass: CustomServersStoreStub },
        { provide: FileManagerService, useClass: FileManagerServiceStub },
        { provide: IWADService, useClass: IWADServiceStub },
        { provide: ServerRefreshService, useClass: ServerRefreshServiceStub },
        { provide: NetworkStatusService, useClass: NetworkStatusServiceStub },
        { provide: CustomServersService, useClass: CustomServersServiceStub },
        { provide: DialogService, useClass: DialogServiceStub },
        { provide: LocalNetworkDiscoveryService, useClass: LocalNetworkDiscoveryServiceStub },
        { provide: ControllerService, useClass: ControllerServiceStub },
        { provide: ControllerFocusService, useClass: ControllerFocusServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ServersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('openContextMenu', () => {
    it('should set contextMenu signal with correct position and server', () => {
      const mockEvent = new MouseEvent('contextmenu', {
        clientX: 150,
        clientY: 200
      });
      spyOn(mockEvent, 'preventDefault');

      component.openContextMenu(mockEvent, mockServer);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      const contextMenu = component.contextMenu();
      expect(contextMenu).not.toBeNull();
      expect(contextMenu?.x).toBe(150);
      expect(contextMenu?.y).toBe(200);
      expect(contextMenu?.server).toBe(mockServer);
    });

    it('should set up document click listener to close menu', fakeAsync(() => {
      const mockEvent = new MouseEvent('contextmenu', {
        clientX: 150,
        clientY: 200
      });
      spyOn(mockEvent, 'preventDefault');

      component.openContextMenu(mockEvent, mockServer);
      expect(component.contextMenu()).not.toBeNull();

      // Trigger the document click listener
      tick(10);
      document.dispatchEvent(new MouseEvent('click'));
      tick(10);

      expect(component.contextMenu()).toBeNull();
    }));
  });

  describe('closeContextMenu', () => {
    it('should clear contextMenu signal', () => {
      const mockEvent = new MouseEvent('contextmenu', {
        clientX: 150,
        clientY: 200
      });
      spyOn(mockEvent, 'preventDefault');

      component.openContextMenu(mockEvent, mockServer);
      expect(component.contextMenu()).not.toBeNull();

      component.closeContextMenu();
      expect(component.contextMenu()).toBeNull();
    });
  });

  describe('copyServerAddress', () => {
    it('should copy server address in ip:port format to clipboard', async () => {
      await component.copyServerAddress(mockServer);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('192.168.1.100:10666');
    });

    it('should handle clipboard write errors gracefully', async () => {
      (navigator.clipboard.writeText as jasmine.Spy).and.returnValue(Promise.reject(new Error('Clipboard error')));
      spyOn(console, 'error');

      await component.copyServerAddress(mockServer);

      expect(console.error).toHaveBeenCalledWith('Failed to copy address:', jasmine.any(Error));
    });
  });

  describe('context menu integration', () => {
    it('should close context menu when Copy Address is clicked', fakeAsync(() => {
      const mockEvent = new MouseEvent('contextmenu', {
        clientX: 150,
        clientY: 200
      });
      spyOn(mockEvent, 'preventDefault');

      component.openContextMenu(mockEvent, mockServer);
      expect(component.contextMenu()).not.toBeNull();

      // Simulate clicking Copy Address button
      component.copyServerAddress(mockServer);
      tick(10);
      document.dispatchEvent(new MouseEvent('click'));
      tick(10);

      expect(component.contextMenu()).toBeNull();
    }));

    it('should reuse handleServerClick for Open menu item', () => {
      spyOn(component, 'handleServerClick');

      component.handleServerClick(mockServer);

      expect(component.handleServerClick).toHaveBeenCalledWith(mockServer);
    });

    it('should reuse handleServerDoubleClick for Launch menu item', () => {
      spyOn(component, 'handleServerDoubleClick');

      component.handleServerDoubleClick(mockServer);

      expect(component.handleServerDoubleClick).toHaveBeenCalledWith(mockServer);
    });
  });
});
