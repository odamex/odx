import { Component } from '@angular/core';
import { ipcRenderer } from 'electron';
import { ElectronService } from './providers/electron.service';
import { TranslateService } from '@ngx-translate/core';
import { AppConfig } from '../environments/environment';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent {

	ipc: typeof ipcRenderer;

	constructor(public electronService: ElectronService,
		private translate: TranslateService) {

		translate.setDefaultLang('en');
		console.log('AppConfig', AppConfig);

		if (electronService.isElectron()) {
			this.ipc = electronService.ipcRenderer;

			console.log('Mode electron');
			console.log('Electron ipcRenderer', this.ipc);
			console.log('NodeJS childProcess', electronService.childProcess);
		} else {
			console.log('Mode web');
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
}
