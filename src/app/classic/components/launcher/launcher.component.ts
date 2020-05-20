import { Component, OnInit } from '@angular/core';
import { MasterQueryService } from '../../../shared/providers/masterserver.service';

@Component({
	selector: 'app-classic-launcher',
	templateUrl: './launcher.component.html',
	styleUrls: ['./launcher.component.scss']
})
export class ClassicLauncherComponent implements OnInit {



	constructor(
		private master: MasterQueryService
	) { }

	ngOnInit() {
		this.master.query();
	}

}
