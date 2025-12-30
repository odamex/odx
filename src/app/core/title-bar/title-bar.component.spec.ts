import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TitleBarComponent } from './title-bar.component';
import { NetworkStatusService, OdamexServiceStatusService, ControllerService } from '@shared/services';
import { signal } from '@angular/core';

class NetworkStatusServiceStub {
  readonly isOnline = signal(true).asReadonly();
}

class OdamexServiceStatusServiceStub {
  readonly connectionStatus = signal<'online' | 'offline' | 'degraded'>('online').asReadonly();
}

class ControllerServiceStub {
  readonly connected = signal(false).asReadonly();
  readonly controllerName = signal('Test Controller').asReadonly();
  readonly schema = signal('xbox').asReadonly();
}

describe('TitleBarComponent', () => {
  let component: TitleBarComponent;
  let fixture: ComponentFixture<TitleBarComponent>;
  const originalElectron = (window as any).electron;

  afterEach(() => {
    (window as any).electron = originalElectron;
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TitleBarComponent],
      providers: [
        { provide: NetworkStatusService, useClass: NetworkStatusServiceStub },
        { provide: OdamexServiceStatusService, useClass: OdamexServiceStatusServiceStub },
        { provide: ControllerService, useClass: ControllerServiceStub }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(TitleBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render window controls when running on win32', () => {
    (window as any).electron = {
      platform: 'win32',
      minimizeWindow: jasmine.createSpy('minimizeWindow'),
      maximizeWindow: jasmine.createSpy('maximizeWindow'),
      closeWindow: jasmine.createSpy('closeWindow')
    };

    fixture = TestBed.createComponent(TitleBarComponent);
    fixture.detectChanges();
    const controls = fixture.nativeElement.querySelector('.window-controls');
    expect(controls).not.toBeNull();
  });

  it('should hide window controls when platform is unknown', () => {
    (window as any).electron = undefined;
    fixture = TestBed.createComponent(TitleBarComponent);
    fixture.detectChanges();
    const controls = fixture.nativeElement.querySelector('.window-controls');
    expect(controls).toBeNull();
  });

  it('should call electron window methods when available', () => {
    const minimizeWindow = jasmine.createSpy('minimizeWindow');
    const maximizeWindow = jasmine.createSpy('maximizeWindow');
    const closeWindow = jasmine.createSpy('closeWindow');

    (window as any).electron = {
      platform: 'win32',
      minimizeWindow,
      maximizeWindow,
      closeWindow
    };

    fixture = TestBed.createComponent(TitleBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component['onMinimize']();
    component['onMaximize']();
    component['onClose']();

    expect(minimizeWindow).toHaveBeenCalled();
    expect(maximizeWindow).toHaveBeenCalled();
    expect(closeWindow).toHaveBeenCalled();
  });
});
