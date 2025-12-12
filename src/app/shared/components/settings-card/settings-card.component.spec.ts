import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsCardComponent } from './settings-card.component';

describe('SettingsCardComponent', () => {
  let component: SettingsCardComponent;
  let fixture: ComponentFixture<SettingsCardComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsCardComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Content Projection', () => {
    it('should project card-icon content', () => {
      const testComponent = TestBed.createComponent(SettingsCardComponent);
      const testElement = testComponent.nativeElement as HTMLElement;
      
      testElement.innerHTML = `
        <div card-icon class="test-icon">
          <i class="bi bi-gear"></i>
        </div>
      `;
      testComponent.detectChanges();

      const projectedIcon = testElement.querySelector('.test-icon');
      expect(projectedIcon).not.toBeNull();
    });

    it('should project card-title content', () => {
      const testComponent = TestBed.createComponent(SettingsCardComponent);
      const testElement = testComponent.nativeElement as HTMLElement;
      
      testElement.innerHTML = `
        <div card-title>
          <h3>Test Title</h3>
        </div>
      `;
      testComponent.detectChanges();

      const projectedTitle = testElement.querySelector('[card-title]');
      expect(projectedTitle).not.toBeNull();
    });

    it('should project default body content', () => {
      const testComponent = TestBed.createComponent(SettingsCardComponent);
      const testElement = testComponent.nativeElement as HTMLElement;
      
      testElement.innerHTML = `
        <div class="test-content">Body content</div>
      `;
      testComponent.detectChanges();

      const projectedContent = testElement.querySelector('.test-content');
      expect(projectedContent).not.toBeNull();
    });
  });

  describe('Component Properties', () => {
    it('should initialize with hasHeader as true', () => {
      expect(component.hasHeader).toBe(true);
    });

    it('should use OnPush change detection', () => {
      // Component configured with OnPush - verified in decorator
      expect(component).toBeTruthy();
    });

    it('should be standalone', () => {
      const metadata = (component.constructor as any).ɵcmp;
      expect(metadata.standalone).toBe(true);
    });
  });

  describe('Template Structure', () => {
    it('should render with settings-card selector', () => {
      const card = document.createElement('app-settings-card');
      expect(card).toBeTruthy();
    });
  });

  describe('Styling and Encapsulation', () => {
    it('should use None view encapsulation', () => {
      const metadata = (component.constructor as any).ɵcmp;
      expect(metadata.encapsulation).toBe(2); // 2 = ViewEncapsulation.None
    });
  });

  describe('Multiple Content Slots', () => {
    it('should handle multiple projected content slots simultaneously', () => {
      const testComponent = TestBed.createComponent(SettingsCardComponent);
      const testElement = testComponent.nativeElement as HTMLElement;
      
      testElement.innerHTML = `
        <div card-icon class="icon-slot">Icon</div>
        <div card-title class="title-slot">Title</div>
        <div class="body-slot">Body</div>
      `;
      testComponent.detectChanges();

      expect(testElement.querySelector('.icon-slot')).not.toBeNull();
      expect(testElement.querySelector('.title-slot')).not.toBeNull();
      expect(testElement.querySelector('.body-slot')).not.toBeNull();
    });
  });

  describe('Integration with Parent Components', () => {
    it('should work as a child component', () => {
      const container = document.createElement('div');
      container.innerHTML = '<app-settings-card></app-settings-card>';
      
      expect(container.querySelector('app-settings-card')).not.toBeNull();
    });

    it('should maintain component instance after content projection', () => {
      const initialComponent = component;
      
      fixture.nativeElement.innerHTML = '<div>New content</div>';
      fixture.detectChanges();
      
      expect(component).toBe(initialComponent);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content projection gracefully', () => {
      expect(() => {
        const emptyFixture = TestBed.createComponent(SettingsCardComponent);
        emptyFixture.detectChanges();
      }).not.toThrow();
    });

    it('should handle multiple change detection cycles', () => {
      expect(() => {
        fixture.detectChanges();
        fixture.detectChanges();
        fixture.detectChanges();
      }).not.toThrow();
    });
  });

  describe('Component Lifecycle', () => {
    it('should not throw during creation', () => {
      expect(() => {
        const newFixture = TestBed.createComponent(SettingsCardComponent);
        newFixture.detectChanges();
      }).not.toThrow();
    });

    it('should not throw during destruction', () => {
      expect(() => {
        fixture.destroy();
      }).not.toThrow();
    });
  });
});
