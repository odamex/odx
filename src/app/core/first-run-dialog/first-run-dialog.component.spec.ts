import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FirstRunDialogComponent } from './first-run-dialog.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

describe('FirstRunDialogComponent', () => {
  let component: FirstRunDialogComponent;
  let fixture: ComponentFixture<FirstRunDialogComponent>;
  let activeModal: NgbActiveModal;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FirstRunDialogComponent],
      providers: [
        { provide: NgbActiveModal, useValue: { close: jasmine.createSpy('close') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FirstRunDialogComponent);
    component = fixture.componentInstance;
    activeModal = TestBed.inject(NgbActiveModal);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle custom path visibility', () => {
    expect(component.showCustomPath()).toBe(false);
    component.toggleCustomPath();
    expect(component.showCustomPath()).toBe(true);
  });

  it('should update custom path', () => {
    component.updateCustomPath('C:\\Odamex');
    expect(component.customPath()).toBe('C:\\Odamex');
  });

  it('should close with detected choice', () => {
    component.selectDetected();
    expect((activeModal as any).close).toHaveBeenCalledWith({ action: 'detected' });
  });

  it('should close with download choice', () => {
    component.selectDownload();
    expect((activeModal as any).close).toHaveBeenCalledWith({ action: 'download' });
  });

  it('should close with custom choice when path is set', () => {
    component.updateCustomPath('C:\\Odamex');
    component.selectCustom();
    expect((activeModal as any).close).toHaveBeenCalledWith({ action: 'custom', customPath: 'C:\\Odamex' });
  });

  it('should not close with custom choice when path is empty', () => {
    component.updateCustomPath('');
    component.selectCustom();
    expect((activeModal as any).close).not.toHaveBeenCalledWith({ action: 'custom', customPath: '' });
  });
});
