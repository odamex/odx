import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassicLauncherComponent } from './launcher.component';
import { TranslateModule } from '@ngx-translate/core';

describe('ClassicLauncherComponent', () => {
	let component: ClassicLauncherComponent;
	let fixture: ComponentFixture<ClassicLauncherComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ ClassicLauncherComponent ],
			imports: [
				TranslateModule.forRoot()
			]
		})
	.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ClassicLauncherComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should render title in a h1 tag', async(() => {
		const compiled = fixture.debugElement.nativeElement;
		expect(compiled.querySelector('h1').textContent).toContain('PAGES.HOME.TITLE');
	}));
});
