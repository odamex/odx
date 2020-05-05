import { app, BrowserView, BrowserWindow, screen, ipcMain, Menu, shell, dialog } from 'electron';
import * as path from 'path';
import * as url from 'url';

import { menuTemplate } from './src/app/core/electron-menu';

let win, serve;
// let view;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');
// Windows gets custom treatment, the rest it's best to just let the OS handle the chrome
const showFrame = true; //(!(process.platform === 'win32'));

const baseWidth = 800; // size.width;
const baseHeight = 600; // size.height;

function createWindow() {

	makeSingleInstance();

	const electronScreen = screen;
	const size = electronScreen.getPrimaryDisplay().workAreaSize;

	// Create the browser window.
	win = new BrowserWindow({
		x: 0,
		y: 0,
		width: baseWidth,
		height: baseHeight,
		minHeight: baseHeight,
		minWidth: baseWidth,
		frame: showFrame,
		title: 'ODX Classic Launcher',
		icon: path.join(__dirname, 'assets/logo_icon.png'),
		// titleBarStyle: 'hidden',
		webPreferences: {
			// Disable auxclick event
			// See https://developers.google.com/web/updates/2016/10/auxclick
			disableBlinkFeatures: 'Auxclick',
			// Enable, among other things, the ResizeObserver
			experimentalFeatures: true,
			nodeIntegration: true
		}
	});

	if (serve) {
		require('electron-reload')(__dirname, {
			electron: require(`${__dirname}/node_modules/electron`)
		});
		win.loadURL('http://localhost:4200');
	} else {
		win.loadURL(url.format({
			pathname: path.join(__dirname, 'dist/index.html'),
			protocol: 'file:',
			slashes: true
		}));
	}

	// Emitted when the window is closed.
	win.on('closed', () => {
		// Dereference the window object, usually you would store window
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		win = null;
	});

	win.on('focus', () => {
		win.flashFrame(false);
	});

	// Set up Windows "flash frame"
	// TODO: Bounce the MAC dock icon
	ipcMain.on('flash-main-window', () => {
		win.flashFrame(true);
	});

	ipcMain.on('unflash-main-window', () => {
		win.flashFrame(false);
	});


	ipcMain.on('close-main-window', () => {
		app.quit();
	});

	ipcMain.on('minimize-main-window', () => {
		win.minimize();
	});

	ipcMain.on('maximize-main-window', () => {
		console.log('Maximize main window');
		win.maximize();
	});

	ipcMain.on('unmaximize-main-window', () => {
		console.log('Unmaximize main window');
		win.unmaximize();
	});

	ipcMain.on('fullscreen-main-window', (e, arg) => {
		console.log('Going fullscreen...');
		win.setFullScreen(arg);
	});

	ipcMain.on('check-fullscreen', () => {
		win.webContents.send('fullScreenResponse', win.isFullScreen());
	});

	// Set standard application menu
	Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

	console.log('mainWindow opened');
}

try {

	// This method will be called when Electron has finished
	// initialization and is ready to create browser windows.
	// Some APIs can only be used after this event occurs.
	app.on('ready', createWindow);

	// Quit when all windows are closed.
	app.on('window-all-closed', () => {
		// On OS X it is common for applications and their menu bar
		// to stay active until the user quits explicitly with Cmd + Q
		if (process.platform !== 'darwin') {
			app.quit();
		}
	});

	app.on('activate', () => {
		// On OS X it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (win === null) {
			createWindow();
		}
	});

} catch (e) {
	// Catch Error
	// throw e;
}


// Make this app a single instance app.
//
// The main window will be restored and focused instead of a second window
// opened when a person attempts to launch a second instance.
//
// Returns true if the current version of the app should quit instead of
// launching.
function makeSingleInstance(): void {
	if (process.mas) {
		return;
	}

	app.requestSingleInstanceLock()

	app.on('second-instance', () => {
		if (win) {
			if (win.isMinimized()) {
				win.restore();
				win.focus();
			}
		}
	});
}
