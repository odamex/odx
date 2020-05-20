import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ipcRenderer } from 'electron';
import { ElectronService } from './shared/providers/electron.service';
import { TranslateService } from '@ngx-translate/core';
import { AppConfig } from '../environments/environment';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

	ipc: typeof ipcRenderer;
	windowTitle = '';
	isFullScreen = false;
	winStateClass = '';

	constructor(
		public electronService: ElectronService,
		private translate: TranslateService,
		private cdr: ChangeDetectorRef) {

		this.translate.setDefaultLang('en');

		if (electronService.isElectron()) {
			this.ipc = electronService.ipcRenderer;

			this.windowTitle = electronService.remote.getCurrentWindow().getTitle();

			console.log('Mode electron');
			console.log('NodeJS childProcess', electronService.childProcess);
		} else {
			console.log('Mode web');
			this.windowTitle = 'ODX :: Classic Launcher';
		}

	}

	/* Window state change methods */
	btnMaximize(e) {
		e.preventDefault();
		console.log('Calling maximize ipc');
		this.ipc.send('maximize-main-window');
	}

	btnMinimize(e) {
		e.preventDefault();
		this.ipc.send('minimize-main-window');
	}

	btnClose(e) {
		e.preventDefault();
		console.log('Close main window');
		this.ipc.send('close-main-window');
	}

	btnUnmaximize(e) {
		e.preventDefault();
		console.log('Calling restore ipc');
		this.ipc.send('unmaximize-main-window');
	}

	btnToggleFullscreen(e) {
		e.preventDefault();

		this.ipc.once('fullScreenResponse', (event, arg) => {
			console.log(event);
			console.log(arg);
		});
		this.ipc.send('check-fullscreen', (event, arg) => {
			console.log(event);
			console.log(arg);
		});

		const flag = !(this.isFullScreen);
		console.log('Flag is ', flag);
		this.ipc.send('fullscreen-main-window', flag);
	}

	ngOnInit(): void {
		if (this.electronService.isElectron()) {

			// Prevent drag/drop of links that navigate away
			document.addEventListener('dragover', event => event.preventDefault());
			document.addEventListener('drop', event => event.preventDefault());

			// Flash window initially, stop on focus
			this.ipc.send('flash-main-window');
		}

		console.log('initing...');
	}

	ngOnDestroy(): void {
		if (this.electronService.isElectron()) {
			console.log('Destroying window...');
			const w = window.require('electron').remote.getCurrentWindow();
			w.off('focus', () => {});
			w.off('minimize', () => {});
			w.off('maximize', () => {
				this.winStateClass = 'maximized';
				this.cdr.detectChanges();
			});
			w.off('unmaximize', () => {});
		}
	}
}
