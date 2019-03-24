import { app, BrowserWindow, screen, Tray, Menu, nativeImage, shell, ipcMain, webContents } from 'electron';
import * as path from 'path';
import * as url from 'url';
import { INTERNAL_BROWSER_DYNAMIC_PLATFORM_PROVIDERS } from '@angular/platform-browser-dynamic/src/platform_providers';
import * as winston from 'winston';

let win: BrowserWindow;
let contents: webContents;
let serve;
const tempDir = app.getPath('temp');
const logPath = path.join(tempDir, './electoStat.log');
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [
    new winston.transports.File({ filename: logPath }),
    new winston.transports.Console({
      format:
        winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(info => `${info.timestamp}: ${info.level} - ${info.message}`)
        ),
    })
  ]
});

function createWindow() {
  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;
  logger.info('Creating electroStat Main Window...');
  // Create the browser window.
  win = new BrowserWindow({
    x: (size.width / 2) - 400,
    y: (size.height / 2) - 300,
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
    icon: __dirname + '/dist/favicon.png',
    show: false
  });
  // use this object for ipc messaging
  contents = win.webContents;

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
  // JRM edits here
  win.setResizable(false); // no window resizing for you!
  logger.info('Sending showLastALert to ipcRenderer');
  contents.send('showLastAlert');
  // tray icon and context menu
  let tray = null;
  const iconPath = path.join(__dirname, './dist/favicon.png');
  let trayIcon = nativeImage.createFromPath(iconPath);
  trayIcon = trayIcon.resize({width: 16, height: 16});
  logger.info(`trayIcon path: ${iconPath}`);
  tray = new Tray(trayIcon);

  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'See Last Alert',
      type: 'normal',
      click(item) {
       seeLastAlert();
      }
    },
    {
      label: 'Show Past Alerts',
      type: 'normal',
      click(item) {
        showPastAlerts();
      }
    },
    {
      label: 'View Log File',
      type: 'normal',
      click(item) {
        viewLogFile();
      }
    },
    { type: 'separator'},
    {
      label: 'Play Sound?',
      type: 'checkbox',
      checked: true,
      click(item) {
        togglePlaySound();
      }
    },
    {
      label: 'Show ALL alerts?',
      type: 'checkbox',
      checked: false,
      click(item) {
        toggleShowAll();
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      role: 'quit'
    },
  ];
  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setToolTip('Stat!');
  tray.setContextMenu(contextMenu);
  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
}

function viewLogFile() {
  logger.info('viewLogFile was clicked!');
}

function showPastAlerts() {
  logger.info('showPastAlerts was clicked!');
  shell.openExternal('https://stat.uvmhealth.org/home/alerts');
}

function seeLastAlert() {
  // TODO: pass this from ipcMain to ipcRenderer
  logger.info('See Last Alert menuItem was clicked!');
}

function togglePlaySound() {
  logger.info('togglePlaySound() was clicked!');
}

function toggleShowAll() {
  logger.info('toggleShowAll() was clicked!');
}

ipcMain.on('alertReceived', (event, arg) => {
  logger.info('alertReceived call from ipcMain!');
});

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
