import { Component, OnInit } from '@angular/core';
import { ipcRenderer } from 'electron';
import { ElectronService } from './providers/electron.service';
import { TranslateService } from '@ngx-translate/core';
import { AppConfig } from '../environments/environment';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

	ipc: typeof ipcRenderer;
	windowTitle: String | string;

	constructor(public electronService: ElectronService,
		private translate: TranslateService) {

		translate.setDefaultLang('en');
		console.log('AppConfig', AppConfig);

		if (electronService.isElectron()) {
			this.ipc = electronService.ipcRenderer;

			this.windowTitle = electronService.remote.getCurrentWindow().getTitle();

			console.log('Mode electron');
			console.log('Electron ipcRenderer', this.ipc);
			console.log('NodeJS childProcess', electronService.childProcess);
		} else {
			console.log('Mode web');
			this.windowTitle = 'ODX :: Classic Launcher';
		}
	}

	isFullScreen = false;

	/* Window state change methods */
	winMaximize(e) {
		e.preventDefault();
		this.ipc.send('maximize-main-window');
	}

	winMinimize(e) {
		e.preventDefault();
		this.ipc.send('minimize-main-window');
	}

	winClose(e) {
		e.preventDefault();
		console.log('Close main window');
		this.ipc.send('close-main-window');
	}

	winUnmaximize(e) {
		e.preventDefault();
		this.ipc.send('unmaximize-main-window');
	}

	winToggleFullscreen(e) {
		e.preventDefault();

		this.ipc.once('fullScreenResponse', (event, arg) => {
			console.log(event);
			console.log(arg);
		});
		this.ipc.send('check-fullscreen');

		const flag = !(this.isFullScreen);
		this.ipc.send('fullscreen-main-window', flag);
	}

	ngOnInit() {
		if (this.electronService.isElectron()) {
			const w = window.require('electron').remote.getCurrentWindow();
			w.on('minimize', () => {
				document.querySelector('body').className = 'minimized';
			});
			w.on('maximize', () => {
				document.querySelector('body').className = 'maximized';
			});
			w.on('unmaximize', () => {
				document.querySelector('body').className = '';
			});

			this.ipc.send('flash-main-window');
			w.on('focus', () => this.ipc.send('unflash-main-window'));
		}
	}
}
