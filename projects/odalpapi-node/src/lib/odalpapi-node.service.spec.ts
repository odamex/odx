import { TestBed } from '@angular/core/testing';

import { OdalpapiNodeService } from './odalpapi-node.service';

describe('OdalpapiNodeService', () => {
  let service: OdalpapiNodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OdalpapiNodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
