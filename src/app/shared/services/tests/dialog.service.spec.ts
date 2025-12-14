import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { DialogService, DialogPresets } from '../dialog.service';

@Component({
  selector: 'app-test-modal',
  template: '<div>Test Modal</div>',
  standalone: true
})
class TestModalComponent {
  testData = 'test';
}

describe('DialogService', () => {
  let service: DialogService;
  let mockModal: jasmine.SpyObj<NgbModal>;
  let mockModalRef: jasmine.SpyObj<NgbModalRef>;

  beforeEach(() => {
    mockModalRef = jasmine.createSpyObj('NgbModalRef', ['close', 'dismiss'], {
      result: Promise.resolve('test result'),
      componentInstance: {}
    });

    mockModal = jasmine.createSpyObj('NgbModal', ['open', 'dismissAll', 'hasOpenModals']);
    mockModal.open.and.returnValue(mockModalRef);

    TestBed.configureTestingModule({
      providers: [
        DialogService,
        { provide: NgbModal, useValue: mockModal }
      ]
    });
    
    service = TestBed.inject(DialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('open', () => {
    it('should open a modal with component', () => {
      service.open(TestModalComponent);
      
      expect(mockModal.open).toHaveBeenCalledWith(
        TestModalComponent,
        jasmine.any(Object)
      );
    });

    it('should use standard preset by default', () => {
      service.open(TestModalComponent);
      
      expect(mockModal.open).toHaveBeenCalledWith(
        TestModalComponent,
        jasmine.objectContaining({
          backdrop: true,
          keyboard: true,
          centered: true
        })
      );
    });

    it('should apply custom configuration', () => {
      service.open(TestModalComponent, {
        size: 'lg',
        backdrop: 'static'
      });
      
      expect(mockModal.open).toHaveBeenCalledWith(
        TestModalComponent,
        jasmine.objectContaining({
          size: 'lg',
          backdrop: 'static'
        })
      );
    });

    it('should return modal reference', () => {
      const ref = service.open(TestModalComponent);
      
      expect(ref).toBe(mockModalRef);
    });

    it('should use provided config', () => {
      service.open(TestModalComponent, {
        size: 'xl',
        backdrop: false
      });
      
      expect(mockModal.open).toHaveBeenCalledWith(
        TestModalComponent,
        jasmine.objectContaining({
          size: 'xl',
          backdrop: false
        })
      );
    });
  });

  describe('dismissAll', () => {
    it('should dismiss all open modals', () => {
      service.dismissAll();
      
      expect(mockModal.dismissAll).toHaveBeenCalled();
    });

    it('should pass dismiss reason', () => {
      service.dismissAll('test reason');
      
      expect(mockModal.dismissAll).toHaveBeenCalledWith('test reason');
    });
  });

  describe('hasOpenModals', () => {
    it('should return true when modals are open', () => {
      mockModal.hasOpenModals.and.returnValue(true);
      
      expect(service.hasOpenModals()).toBe(true);
    });

    it('should return false when no modals are open', () => {
      mockModal.hasOpenModals.and.returnValue(false);
      
      expect(service.hasOpenModals()).toBe(false);
    });
  });

  describe('DialogPresets', () => {
    it('should provide standard preset', () => {
      const preset = DialogPresets.standard();
      
      expect(preset.backdrop).toBe(true);
      expect(preset.keyboard).toBe(true);
      expect(preset.centered).toBe(true);
    });

    it('should provide non-dismissible preset', () => {
      const preset = DialogPresets.nonDismissible();
      
      expect(preset.backdrop).toBe('static');
      expect(preset.keyboard).toBe(false);
    });

    it('should provide large preset', () => {
      const preset = DialogPresets.large();
      
      expect(preset.size).toBe('lg');
      expect(preset.backdrop).toBe(true);
    });

    it('should provide confirmation preset', () => {
      const preset = DialogPresets.confirmation();
      
      expect(preset.centered).toBe(true);
      expect(preset.size).toBe('sm');
    });
  });

  describe('modal reference', () => {
    it('should allow access to component instance', () => {
      const ref = service.open(TestModalComponent);
      
      expect(ref.componentInstance).toBeDefined();
    });

    it('should allow closing modal', () => {
      const ref = service.open(TestModalComponent);
      ref.close('result');
      
      expect(mockModalRef.close).toHaveBeenCalledWith('result');
    });

    it('should allow dismissing modal', () => {
      const ref = service.open(TestModalComponent);
      ref.dismiss('reason');
      
      expect(mockModalRef.dismiss).toHaveBeenCalledWith('reason');
    });

    it('should provide result promise', async () => {
      const ref = service.open(TestModalComponent);
      const result = await ref.result;
      
      expect(result).toBe('test result');
    });
  });
});
