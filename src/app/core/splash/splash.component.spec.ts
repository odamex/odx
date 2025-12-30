import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SplashComponent } from './splash.component';

describe('SplashComponent', () => {
  let component: SplashComponent;
  let fixture: ComponentFixture<SplashComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplashComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SplashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render default message and version', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.status-message')?.textContent).toContain('Initializing...');
    expect(compiled.querySelector('.version-info')?.textContent).toContain('1.0.0');
  });

  it('should hide message when empty', () => {
    fixture.componentRef.setInput('message', '');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.status-message')).toBeNull();
  });

  it('should show progress bar when progress is set', () => {
    fixture.componentRef.setInput('progress', 42);
    fixture.detectChanges();
    const progress = fixture.nativeElement.querySelector('.progress-container');
    expect(progress).not.toBeNull();
  });

  it('should apply fade-out class when fadeOut is true', () => {
    fixture.componentRef.setInput('fadeOut', true);
    fixture.detectChanges();
    const overlay = fixture.nativeElement.querySelector('.splash-overlay');
    expect(overlay?.classList.contains('fade-out')).toBe(true);
  });
});
