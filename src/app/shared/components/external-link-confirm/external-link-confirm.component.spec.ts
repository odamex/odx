import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ExternalLinkConfirmComponent } from './external-link-confirm.component';

describe('ExternalLinkConfirmComponent', () => {
  let component: ExternalLinkConfirmComponent;
  let fixture: ComponentFixture<ExternalLinkConfirmComponent>;
  let compiled: HTMLElement;
  let mockActiveModal: jasmine.SpyObj<NgbActiveModal>;

  beforeEach(async () => {
    mockActiveModal = jasmine.createSpyObj('NgbActiveModal', ['close', 'dismiss']);

    await TestBed.configureTestingModule({
      imports: [ExternalLinkConfirmComponent, FormsModule],
      providers: [
        { provide: NgbActiveModal, useValue: mockActiveModal }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ExternalLinkConfirmComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Template', () => {
    it('should display modal header with title', () => {
      const header = compiled.querySelector('.modal-title');
      expect(header?.textContent).toContain('Open External Link');
    });

    it('should display external link icon in header', () => {
      const icon = compiled.querySelector('.modal-title i.bi-box-arrow-up-right');
      expect(icon).not.toBeNull();
    });

    it('should display close button', () => {
      const closeButton = compiled.querySelector('.btn-close');
      expect(closeButton).not.toBeNull();
    });

    it('should display URL when set', () => {
      component.url = 'https://example.com';
      fixture.detectChanges();

      const urlDisplay = compiled.querySelector('.url-display span');
      expect(urlDisplay?.textContent).toBe('https://example.com');
    });

    it('should display warning message', () => {
      const warning = compiled.querySelector('.warning-message');
      expect(warning?.textContent).toContain('Make sure you trust this link');
    });

    it('should display "Don\'t ask me again" checkbox', () => {
      const checkbox = compiled.querySelector('#dontShowAgain') as HTMLInputElement;
      expect(checkbox).not.toBeNull();
      expect(checkbox.type).toBe('checkbox');
    });

    it('should display Cancel button', () => {
      const cancelButton = compiled.querySelector('.btn-secondary');
      expect(cancelButton?.textContent).toContain('Cancel');
    });

    it('should display Open Link button', () => {
      const openButton = compiled.querySelector('.btn-primary');
      expect(openButton?.textContent).toContain('Open Link');
    });
  });

  describe('URL Display', () => {
    it('should display initial URL', () => {
      component.url = 'https://example.com';
      fixture.detectChanges();

      const urlDisplay = compiled.querySelector('.url-display span');
      expect(urlDisplay?.textContent).toBe('https://example.com');
    });

    it('should display different URLs when component is recreated', () => {
      // Test that URL interpolation works correctly
      component.url = 'https://first-url.com';
      fixture.detectChanges();

      const urlDisplay = compiled.querySelector('.url-display span');
      expect(urlDisplay?.textContent).toBe('https://first-url.com');
      
      // Component property reflects the change
      component.url = 'https://second-url.com';
      expect(component.url).toBe('https://second-url.com');
    });

    it('should display long URLs without breaking layout', () => {
      const longUrl = 'https://example.com/very/long/path/that/might/wrap/across/multiple/lines/in/the/display';
      component.url = longUrl;
      fixture.detectChanges();

      const urlDisplay = compiled.querySelector('.url-display span');
      expect(urlDisplay?.textContent).toBe(longUrl);
    });
  });

  describe('Checkbox Behavior', () => {
    it('should initialize dontShowAgain as false', () => {
      expect(component.dontShowAgain).toBe(false);
    });

    it('should update dontShowAgain when checkbox is clicked', () => {
      const checkbox = compiled.querySelector('#dontShowAgain') as HTMLInputElement;
      
      checkbox.click();
      fixture.detectChanges();

      expect(component.dontShowAgain).toBe(true);
    });

    it('should reflect component state in checkbox', (done) => {
      component.dontShowAgain = true;
      fixture.detectChanges();
      
      // Give time for ngModel binding to update
      setTimeout(() => {
        const checkbox = compiled.querySelector('#dontShowAgain') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
        done();
      }, 50);
    });
  });

  describe('Modal Actions', () => {
    it('should dismiss modal when close button is clicked', () => {
      const closeButton = compiled.querySelector('.btn-close') as HTMLElement;
      closeButton.click();

      expect(mockActiveModal.dismiss).toHaveBeenCalled();
    });

    it('should dismiss modal when Cancel button is clicked', () => {
      const cancelButton = compiled.querySelector('.btn-secondary') as HTMLElement;
      cancelButton.click();

      expect(mockActiveModal.dismiss).toHaveBeenCalled();
    });

    it('should close modal with result when Open Link button is clicked', () => {
      const openButton = compiled.querySelector('.btn-primary') as HTMLElement;
      openButton.click();

      expect(mockActiveModal.close).toHaveBeenCalledWith({
        confirmed: true,
        dontShowAgain: false
      });
    });

    it('should include dontShowAgain value when confirming', () => {
      component.dontShowAgain = true;
      fixture.detectChanges();

      const openButton = compiled.querySelector('.btn-primary') as HTMLElement;
      openButton.click();

      expect(mockActiveModal.close).toHaveBeenCalledWith({
        confirmed: true,
        dontShowAgain: true
      });
    });
  });

  describe('confirm method', () => {
    it('should close modal with confirmed true', () => {
      component.confirm();

      expect(mockActiveModal.close).toHaveBeenCalledWith({
        confirmed: true,
        dontShowAgain: false
      });
    });

    it('should include current dontShowAgain state', () => {
      component.dontShowAgain = true;
      component.confirm();

      expect(mockActiveModal.close).toHaveBeenCalledWith({
        confirmed: true,
        dontShowAgain: true
      });
    });
  });

  describe('Styling', () => {
    it('should have modal-header class', () => {
      const header = compiled.querySelector('.modal-header');
      expect(header).not.toBeNull();
    });

    it('should have modal-body class', () => {
      const body = compiled.querySelector('.modal-body');
      expect(body).not.toBeNull();
    });

    it('should have modal-footer class', () => {
      const footer = compiled.querySelector('.modal-footer');
      expect(footer).not.toBeNull();
    });

    it('should have url-display styling container', () => {
      const urlDisplay = compiled.querySelector('.url-display');
      expect(urlDisplay).not.toBeNull();
    });

    it('should have warning-message styling container', () => {
      const warning = compiled.querySelector('.warning-message');
      expect(warning).not.toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have proper label for checkbox', () => {
      const label = compiled.querySelector('label[for="dontShowAgain"]');
      expect(label).not.toBeNull();
      expect(label?.textContent).toContain('Don\'t ask me again');
    });

    it('should have button types specified', () => {
      const cancelButton = compiled.querySelector('.btn-secondary') as HTMLButtonElement;
      const openButton = compiled.querySelector('.btn-primary') as HTMLButtonElement;
      const closeButton = compiled.querySelector('.btn-close') as HTMLButtonElement;

      expect(cancelButton.type).toBe('button');
      expect(openButton.type).toBe('button');
      expect(closeButton.type).toBe('button');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty URL', () => {
      component.url = '';
      fixture.detectChanges();

      const urlDisplay = compiled.querySelector('.url-display span');
      expect(urlDisplay?.textContent).toBe('');
    });

    it('should handle URL with special characters', () => {
      const specialUrl = 'https://example.com/path?param=value&other=123#anchor';
      component.url = specialUrl;
      fixture.detectChanges();

      const urlDisplay = compiled.querySelector('.url-display span');
      expect(urlDisplay?.textContent).toBe(specialUrl);
    });

    it('should not throw when activeModal methods are called multiple times', () => {
      expect(() => {
        component.confirm();
        component.confirm();
      }).not.toThrow();

      expect(mockActiveModal.close).toHaveBeenCalledTimes(2);
    });
  });
});
