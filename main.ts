import { app, BrowserWindow, screen } from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as signalR from '@aspnet/signalr';
import { INTERNAL_BROWSER_DYNAMIC_PLATFORM_PROVIDERS } from '@angular/platform-browser-dynamic/src/platform_providers';
import {catService, catProd } from './src/app/models/logging';
let win, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');


function loadUp() {
  initSignalR();
  createWindow();
}

function initSignalR() {
  catProd.info('Initializing signalR client');
  const connection = new signalR.HubConnectionBuilder()
    .withUrl('https://stat.uvmhealth.org/alertHub')
    .configureLogging(signalR.LogLevel.Information)
    .build();

connection.start().then(function () {
    catProd.info('signalR sub-system is now connected...');
});
}

function createWindow() {

  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;
  // tslint:disable-next-line:quotemark
  catProd.info("creating main window...");
  // Create the browser window.
  win = new BrowserWindow({
    x: (size.width / 2) - 400,
    y: (size.height / 2) - 300,
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
    icon: __dirname + '/dist/favicon.png'
  });

  catProd.info(`icon file: ${win.icon}`);

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

  if (serve) {
    win.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

}

try {

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', loadUp);

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
