import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OdalpapiNodeComponent } from './odalpapi-node.component';

describe('OdalpapiNodeComponent', () => {
  let component: OdalpapiNodeComponent;
  let fixture: ComponentFixture<OdalpapiNodeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OdalpapiNodeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OdalpapiNodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
