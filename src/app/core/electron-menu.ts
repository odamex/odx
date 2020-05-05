const {BrowserWindow, Menu, app, shell, dialog} = require('electron');

const appName = app.getName();

export const menuTemplate: Electron.MenuItemConstructorOptions[] = [
	{
		label: 'View',
		submenu: [{
			label: 'Reload',
			accelerator: 'CmdOrCtrl+R',
			click: (item, focusedWindow) => {
				if (focusedWindow) {
					// on reload, start fresh and close any old
					// open secondary windows
					if (focusedWindow.id === 1) {
						BrowserWindow.getAllWindows().forEach(win => {
							if (win.id > 1) {
								win.close();
							}
						});
					}
					focusedWindow.reload();
				}
			}
		}, {
			label: 'Toggle Full Screen',
			accelerator: (() => {
				if (process.platform === 'darwin') {
					return 'Ctrl+Command+F';
				} else {
					return 'F11';
				}
			})(),
			click: (item, focusedWindow) => {
				if (focusedWindow) {
					focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
				}
			}
		}, {
			label: 'Toggle Developer Tools',
			accelerator: (() => {
				if (process.platform === 'darwin') {
					return 'Alt+Command+I';
				} else {
					return 'Ctrl+Shift+I';
				}
			})(),
			click: (item, focusedWindow) => {
				if (focusedWindow) {
					focusedWindow.webContents.toggleDevTools();
				}
			}
		}, {
			type: 'separator'
		}, {
			label: 'Quit',
			accelerator: 'Command+Q',
			click: () => {
				app.quit();
			}
		}]
	}, {
		label: 'Help',
		role: 'help',
		submenu: [{
			label: 'Learn More',
			click: () => {
				shell.openExternal('http://odamex.net');
			}
		}]
	}
];

/*
function addUpdateMenuItems (items, position) {
	if (process.mas) {
		return;
	}

	const version = app.getVersion();

	const updateItems = [{
		label: `Version ${version}`,
		enabled: false
	}, {
		label: 'Checking for Update',
		enabled: false,
		key: 'checkingForUpdate'
	}, {
		label: 'Check for Update',
		visible: false,
		key: 'checkForUpdate',
		click: () => {
			require('electron').autoUpdater.checkForUpdates();
		}
	}, {
		label: 'Restart and Install Update',
		enabled: true,
		visible: false,
		key: 'restartToUpdate',
		click: () => {
			require('electron').autoUpdater.quitAndInstall()
		}
	}];

	items.splice.apply(items, [position, 0].concat(updateItems));
}

function findReopenMenuItem () {
	const menu = Menu.getApplicationMenu()
	if (!menu) {
		return;
	}

	let reopenMenuItem;
	menu.items.forEach(item => {
		if (item.submenu) {
			item.submenu.items.forEach(item => {
				if (item.key === 'reopenMenuItem') {
					reopenMenuItem = item;
				}
			})
		}
	});

	return reopenMenuItem;
}

if (process.platform === 'darwin') {
	addUpdateMenuItems(template[0].submenu, 1);
}

if (process.platform === 'win32') {
	const helpMenu = template[template.length - 2].submenu;
	addUpdateMenuItems(helpMenu, 0);
}
*/

/*
app.on('browser-window-created', () => {
	const reopenMenuItem = findReopenMenuItem();

	if (reopenMenuItem) {
		reopenMenuItem.enabled = false;
	}
});

app.on('window-all-closed', () => {
	const reopenMenuItem = findReopenMenuItem();

	if (reopenMenuItem) {
		reopenMenuItem.enabled = true;
	}
})
*/
