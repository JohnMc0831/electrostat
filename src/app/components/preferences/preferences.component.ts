import { app, BrowserWindow, remote, ipcRenderer, Tray, Menu } from 'electron';
import { Component, OnInit, NgModuleFactoryLoader } from '@angular/core';
import * as url from 'url';
import * as $ from 'jquery';
import * as moment from 'moment';
import { StatAlert } from '../../models/models';
import { ConsoleForElectron } from 'winston-console-for-electron';
import * as winston from 'winston';
import * as signalR from '@aspnet/signalr';
import * as path from 'path';
import { ElectronService } from 'ngx-electron';
import { Howl, Howler } from 'howler';
import fetch from 'electron-fetch';
import * as ip from 'ip';
import { HOST_ATTR } from '@angular/platform-browser/src/dom/dom_renderer';

@Component({
  selector: 'app-preferences',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent implements OnInit {
  public logger: winston.Logger;
  public alertSound: Howl;
  public showAll: boolean;
  public icon: string;

  constructor(private electronSvc: ElectronService) {
    const tempPath = remote.app.getPath('temp');
    const logPath = path.join(tempPath, 'electoStat.log');
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [
        new winston.transports.File({
          filename: logPath,
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({
              format: 'MM-DD-YYYY HH:mm:ss'
            }),
            winston.format.printf(info => `${info.timestamp}: ${info.message}`)
          )
        }),
        new ConsoleForElectron({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({
              format: 'MM-DD-YYYY HH:mm:ss'
            }),
            winston.format.printf(info => `${info.timestamp}: ${info.message}`)
          )
        })
      ]
    });
  }
  renderer: any = ipcRenderer;

  ngOnInit() {
    if (this.electronSvc.isElectronApp) {
      this.logger.info('Awakening ipcRenderer...');
      const imUp: string = this.electronSvc.ipcRenderer.sendSync(
        'prefsChannel',
        'readyForAlerts'
      );
      this.logger.info(`communication to ipcMain completed! ${imUp}`);
      this.icon = url.format({
        pathname: path.join(__dirname, 'assets/stat.png'),
        protocol: 'file:',
        slashes: true
      });
    }
  }


}
