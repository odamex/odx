import { app, BrowserView, BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';
import * as url from 'url';

let win, view, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');

const baseWidth = 800; // size.width;
const baseHeight = 600; // size.height;

function createWindow() {

	const electronScreen = screen;
	const size = electronScreen.getPrimaryDisplay().workAreaSize;

	// Create the browser window.
	win = new BrowserWindow({
		x: 0,
		y: 0,
		width: baseWidth,
		height: baseHeight,
		minHeight: 200,
		minWidth: 320,
		frame: false,
		// titleBarStyle: 'hidden',
		webPreferences: {
			// Disable auxclick event
			// See https://developers.google.com/web/updates/2016/10/auxclick
			disableBlinkFeatures: 'Auxclick',
			// Enable, among other things, the ResizeObserver
			experimentalFeatures: true,
		}
	});

	view = new BrowserView({
		/*webPreferences: {
			nodeIntegration: false
		}*/
	});

	win.setBrowserView(view);
	view.setBounds({ x: 0, y: 0, width: baseWidth, height: baseHeight });
	view.setAutoResize({width: true, height: true});

	if (serve) {
		require('electron-reload')(__dirname, {
			electron: require(`${__dirname}/node_modules/electron`)
		});
		view.webContents.loadURL('http://localhost:4200');
	} else {
		view.webContents.loadURL(url.format({
			pathname: path.join(__dirname, 'dist/index.html'),
			protocol: 'file:',
			slashes: true
		}));
	}

	view.webContents.openDevTools();

	// Emitted when the window is closed.
	win.on('closed', () => {
		// Dereference the window object, usually you would store window
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		win = null;
	});

	ipcMain.on('close-main-window', () => {
		app.quit();
	});

	ipcMain.on('minimize-main-window', () => {
		win.minimize();
	});

	ipcMain.on('maximize-main-window', () => {
		win.maximize();
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
