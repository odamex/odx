import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent } from './loading-spinner.component';

describe('LoadingSpinnerComponent', () => {
  let component: LoadingSpinnerComponent;
  let fixture: ComponentFixture<LoadingSpinnerComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSpinnerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingSpinnerComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('fixed input', () => {
    it('should not have fixed class by default', () => {
      const overlay = compiled.querySelector('.loading-spinner-overlay');
      expect(overlay?.classList.contains('fixed')).toBe(false);
    });

    it('should add fixed class when fixed is true', () => {
      fixture.componentRef.setInput('fixed', true);
      fixture.detectChanges();
      
      const overlay = compiled.querySelector('.loading-spinner-overlay');
      expect(overlay?.classList.contains('fixed')).toBe(true);
    });

    it('should remove fixed class when fixed is false', () => {
      fixture.componentRef.setInput('fixed', true);
      fixture.detectChanges();
      
      fixture.componentRef.setInput('fixed', false);
      fixture.detectChanges();
      
      const overlay = compiled.querySelector('.loading-spinner-overlay');
      expect(overlay?.classList.contains('fixed')).toBe(false);
    });
  });

  describe('message input', () => {
    it('should not display message when empty', () => {
      const message = compiled.querySelector('.spinner-message');
      expect(message).toBeNull();
    });

    it('should display message when provided', () => {
      fixture.componentRef.setInput('message', 'Loading data...');
      fixture.detectChanges();
      
      const message = compiled.querySelector('.spinner-message');
      expect(message).not.toBeNull();
      expect(message?.textContent).toBe('Loading data...');
    });

    it('should update message when changed', () => {
      fixture.componentRef.setInput('message', 'Loading...');
      fixture.detectChanges();
      
      fixture.componentRef.setInput('message', 'Still loading...');
      fixture.detectChanges();
      
      const message = compiled.querySelector('.spinner-message');
      expect(message?.textContent).toBe('Still loading...');
    });

    it('should hide message when set to empty string', () => {
      fixture.componentRef.setInput('message', 'Loading...');
      fixture.detectChanges();
      
      fixture.componentRef.setInput('message', '');
      fixture.detectChanges();
      
      const message = compiled.querySelector('.spinner-message');
      expect(message).toBeNull();
    });
  });

  describe('spinner element', () => {
    it('should always render spinner', () => {
      const spinner = compiled.querySelector('.spinner');
      expect(spinner).not.toBeNull();
    });

    it('should render overlay container', () => {
      const overlay = compiled.querySelector('.loading-spinner-overlay');
      expect(overlay).not.toBeNull();
    });
  });

  describe('combined scenarios', () => {
    it('should handle both fixed and message together', () => {
      fixture.componentRef.setInput('fixed', true);
      fixture.componentRef.setInput('message', 'Loading settings...');
      fixture.detectChanges();
      
      const overlay = compiled.querySelector('.loading-spinner-overlay');
      const message = compiled.querySelector('.spinner-message');
      
      expect(overlay?.classList.contains('fixed')).toBe(true);
      expect(message?.textContent).toBe('Loading settings...');
    });
  });
});
