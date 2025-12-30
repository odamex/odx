import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocalDiscoveryDialogComponent } from './local-discovery-dialog.component';
import { LocalNetworkDiscoveryService } from '@shared/services';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { signal } from '@angular/core';

class LocalNetworkDiscoveryServiceStub {
  private networksSignal = signal([
    { name: 'Ethernet', address: '10.0.0.2', netmask: '255.255.255.0', cidr: '10.0.0.0/24', enabled: true }
  ]);

  readonly detectedNetworks = this.networksSignal.asReadonly();

  toggleNetwork(cidr: string): void {
    this.networksSignal.update(networks =>
      networks.map(n => (n.cidr === cidr ? { ...n, enabled: !n.enabled } : n))
    );
  }
}

describe('LocalDiscoveryDialogComponent', () => {
  let component: LocalDiscoveryDialogComponent;
  let fixture: ComponentFixture<LocalDiscoveryDialogComponent>;
  let localDiscovery: LocalNetworkDiscoveryServiceStub;
  let activeModal: NgbActiveModal;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalDiscoveryDialogComponent],
      providers: [
        { provide: LocalNetworkDiscoveryService, useClass: LocalNetworkDiscoveryServiceStub },
        { provide: NgbActiveModal, useValue: { close: jasmine.createSpy('close'), dismiss: jasmine.createSpy('dismiss') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LocalDiscoveryDialogComponent);
    component = fixture.componentInstance;
    localDiscovery = TestBed.inject(LocalNetworkDiscoveryService) as unknown as LocalNetworkDiscoveryServiceStub;
    activeModal = TestBed.inject(NgbActiveModal);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load networks on init', () => {
    expect(component.networks.length).toBe(1);
    expect(component.networks[0].cidr).toBe('10.0.0.0/24');
  });

  it('should toggle network and refresh list', () => {
    component.toggleNetwork('10.0.0.0/24');
    expect(component.networks[0].enabled).toBe(false);
  });

  it('should close on confirm', () => {
    component.confirm();
    expect((activeModal as any).close).toHaveBeenCalledWith('confirmed');
  });

  it('should dismiss on cancel', () => {
    component.cancel();
    expect((activeModal as any).dismiss).toHaveBeenCalledWith('cancelled');
  });
});
