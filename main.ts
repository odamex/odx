import { app, BrowserView, BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';
import * as url from 'url';

let win, serve;
// let view;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');
// Windows gets custom treatment, the rest it's best to just let the OS handle the chrome
const showFrame = (!(process.platform === 'win32'));

const baseWidth = 800; // size.width;
const baseHeight = 600; // size.height;
const minWidth = 320;
const minHeight = 200;

function createWindow() {

	const electronScreen = screen;
	const size = electronScreen.getPrimaryDisplay().workAreaSize;

	// Create the browser window.
	win = new BrowserWindow({
		x: 0,
		y: 0,
		width: baseWidth,
		height: baseHeight,
		minHeight: minHeight,
		minWidth: minWidth,
		frame: showFrame,
		title: 'ODX Classic Launcher',
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

	/*
	view = new BrowserView({
		webPreferences: {
			nodeIntegration: false
		}
	});

	win.setBrowserView(view);
	view.setBounds({ x: 0, y: 0, width: baseWidth, height: baseHeight });
	view.setAutoResize({width: true, height: true});
	*/

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

	win.webContents.openDevTools();

	// Emitted when the window is closed.
	win.on('closed', () => {
		// Dereference the window object, usually you would store window
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		win = null;
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
