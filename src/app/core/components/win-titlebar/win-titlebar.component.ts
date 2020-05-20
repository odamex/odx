import { Component, OnInit } from '@angular/core';

@Component({
	selector: 'app-win-titlebar',
	templateUrl: './win-titlebar.component.html',
	styleUrls: ['./win-titlebar.component.scss']
})
export class WinTitleBarComponent implements OnInit {

	constructor() { }

	ngOnInit() {
		/*const w = window.require('electron').remote.getCurrentWindow();
		w.on('minimize', () => {
			this.winStateClass = 'minimized';
			this.cdr.detectChanges();
		});
		w.on('maximize', () => {
			this.winStateClass = 'maximized';
			this.cdr.detectChanges();
		});
		w.on('unmaximize', () => {
			this.winStateClass = '';
			this.cdr.detectChanges();
		});
		w.on('enter-full-screen', (e) => {
			console.log('on Set FullScreen');
		});*/
	}

}
