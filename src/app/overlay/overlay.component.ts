import { Component, OnInit } from '@angular/core';

@Component({
	selector: 'app-overlay',
	templateUrl: './overlay.component.html',
	styleUrls: ['./overlay.component.scss']
})
export class OverlayComponent implements OnInit {

	constructor() { }

	ngOnInit(): void {
		console.log("Loading overlay canvas");
	}

}
