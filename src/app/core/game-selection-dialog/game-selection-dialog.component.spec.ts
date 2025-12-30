import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { GameSelectionDialogComponent } from './game-selection-dialog.component';
import { IWADService } from '@shared/services';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

class IWADServiceStub {
  getWADDirectories = jasmine.createSpy('getWADDirectories').and.resolveTo({
    directories: [{ path: 'C:\\Games', recursive: false }],
    scanSteam: true
  });
  saveWADDirectories = jasmine.createSpy('saveWADDirectories').and.resolveTo();
}

describe('GameSelectionDialogComponent', () => {
  let component: GameSelectionDialogComponent;
  let fixture: ComponentFixture<GameSelectionDialogComponent>;
  let iwadService: IWADServiceStub;
  let activeModal: NgbActiveModal;
  const originalElectron = (window as any).electron;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameSelectionDialogComponent],
      providers: [
        { provide: IWADService, useClass: IWADServiceStub },
        { provide: NgbActiveModal, useValue: { close: jasmine.createSpy('close'), dismiss: jasmine.createSpy('dismiss') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GameSelectionDialogComponent);
    component = fixture.componentInstance;
    iwadService = TestBed.inject(IWADService) as unknown as IWADServiceStub;
    activeModal = TestBed.inject(NgbActiveModal);
  });

  afterEach(() => {
    (window as any).electron = originalElectron;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load current configuration on init', waitForAsync(async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.directories().length).toBe(1);
    expect(component.steamScan()).toBe(true);
  }));

  it('should add a directory when selected', fakeAsync(() => {
    (window as any).electron = { fileManager: { pickDirectory: jasmine.createSpy('pickDirectory').and.resolveTo('D:\\Wads') } };
    fixture.detectChanges();
    tick();
    component.addDirectory();
    tick();
    expect(component.directories().some(d => d.path === 'D:\\Wads')).toBe(true);
  }));

  it('should remove a directory by path', () => {
    component.directories.set([{ path: 'C:\\Games', recursive: false }]);
    component.removeDirectory('C:\\Games');
    expect(component.directories().length).toBe(0);
  });

  it('should toggle recursive flag for a directory', () => {
    component.directories.set([{ path: 'C:\\Games', recursive: false }]);
    component.toggleRecursive('C:\\Games');
    expect(component.directories()[0].recursive).toBe(true);
  });

  it('should toggle steam scan', () => {
    component.steamScan.set(true);
    component.toggleSteamScan();
    expect(component.steamScan()).toBe(false);
  });

  it('should save config and close modal on confirm', fakeAsync(() => {
    component.directories.set([{ path: 'C:\\Games', recursive: false }]);
    component.steamScan.set(true);
    component.confirm();
    tick();
    expect(iwadService.saveWADDirectories).toHaveBeenCalled();
    expect((activeModal as any).close).toHaveBeenCalledWith('confirmed');
  }));

  it('should handle save errors and reset loading', fakeAsync(() => {
    iwadService.saveWADDirectories.and.rejectWith(new Error('fail'));
    spyOn(window, 'alert');
    component.confirm();
    tick();
    expect(component.isLoading()).toBe(false);
    expect(window.alert).toHaveBeenCalled();
  }));

  it('should dismiss on cancel', () => {
    component.cancel();
    expect((activeModal as any).dismiss).toHaveBeenCalledWith('cancelled');
  });
});
