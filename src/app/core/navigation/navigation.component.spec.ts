import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NavigationComponent } from './navigation.component';
import { AppSettingsService, ControllerFocusService, ControllerService } from '@shared/services';
import { Router, NavigationEnd } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { signal } from '@angular/core';

class AppSettingsServiceStub {
  private developerModeSignal = signal(false);
  readonly developerMode = this.developerModeSignal.asReadonly();

  setDeveloperMode(enabled: boolean) {
    this.developerModeSignal.set(enabled);
  }
}

class ControllerServiceStub {
  enabled = signal(true).asReadonly();
  private listener?: (event: any) => void;
  readonly unsubscribeSpy = jasmine.createSpy('unsubscribe');

  addEventListener(listener: (event: any) => void): () => void {
    this.listener = listener;
    return this.unsubscribeSpy;
  }

  emit(event: any) {
    this.listener?.(event);
  }
}

class ControllerFocusServiceStub {
  private focusAreaSignal = signal<'navigation' | 'content'>('navigation');
  readonly focusArea = this.focusAreaSignal.asReadonly();
  readonly setFocus = jasmine.createSpy('setFocus').and.callFake((area: 'navigation' | 'content') => {
    this.focusAreaSignal.set(area);
  });

  hasFocus(area: 'navigation' | 'content') {
    return this.focusAreaSignal() === area;
  }
}

describe('NavigationComponent', () => {
  let component: NavigationComponent;
  let fixture: ComponentFixture<NavigationComponent>;
  let appSettings: AppSettingsServiceStub;
  let controllerService: ControllerServiceStub;
  let focusService: ControllerFocusServiceStub;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavigationComponent, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: AppSettingsService, useClass: AppSettingsServiceStub },
        { provide: ControllerService, useClass: ControllerServiceStub },
        { provide: ControllerFocusService, useClass: ControllerFocusServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationComponent);
    component = fixture.componentInstance;
    appSettings = TestBed.inject(AppSettingsService) as unknown as AppSettingsServiceStub;
    controllerService = TestBed.inject(ControllerService) as unknown as ControllerServiceStub;
    focusService = TestBed.inject(ControllerFocusService) as unknown as ControllerFocusServiceStub;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter top nav items when developer mode is disabled', () => {
    appSettings.setDeveloperMode(false);
    expect(component['topNavItems']().some((item: any) => item.path === '/community')).toBe(false);
    expect(component['topNavItems']().some((item: any) => item.path === '/hosting')).toBe(false);
  });

  it('should include dev nav items when developer mode is enabled', () => {
    appSettings.setDeveloperMode(true);
    expect(component['topNavItems']().some((item: any) => item.path === '/community')).toBe(true);
    expect(component['topNavItems']().some((item: any) => item.path === '/hosting')).toBe(true);
  });

  it('should set roving tabindex on init', () => {
    const links = fixture.nativeElement.querySelectorAll('a');
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].tabIndex).toBe(0);
    for (let i = 1; i < links.length; i += 1) {
      expect(links[i].tabIndex).toBe(-1);
    }
  });

  it('should move focus on ArrowDown key', fakeAsync(() => {
    const links = fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;
    links[0].focus();
    component.handleKeyDown({ key: 'ArrowDown', preventDefault: jasmine.createSpy('preventDefault') } as any);
    tick(110);
    expect(document.activeElement).toBe(links[1]);
    expect(links[1].tabIndex).toBe(0);
  }));

  it('should focus content when navigation end targets content routes', fakeAsync(() => {
    const events = router.events as any;
    events.next(new NavigationEnd(1, '/servers', '/servers'));
    tick(150);
    expect(focusService.setFocus).toHaveBeenCalledWith('content');
  }));

  it('should not react to router events after destroy', fakeAsync(() => {
    focusService.setFocus.calls.reset();
    fixture.destroy();

    const events = router.events as any;
    events.next(new NavigationEnd(1, '/servers', '/servers'));
    tick(150);

    expect(focusService.setFocus).not.toHaveBeenCalled();
  }));

  it('should unsubscribe controller listener on destroy', () => {
    fixture.destroy();
    expect(controllerService.unsubscribeSpy).toHaveBeenCalled();
  });
});
