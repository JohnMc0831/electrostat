import { app, BrowserWindow, remote, ipcRenderer, Tray, Menu } from 'electron';
import { Component, OnInit, NgModuleFactoryLoader } from '@angular/core';
import * as $ from 'jquery';
import * as moment from 'moment';
import { StatAlert } from '../../models/models';
import { ConsoleForElectron } from 'winston-console-for-electron';
import * as winston from 'winston';
import * as signalR from '@aspnet/signalr';
import * as path from 'path';
import { ElectronService } from 'ngx-electron';
import { Howl, Howler } from 'howler';
import * as ip from 'ip';
import { ActiveDirectory } from 'activedirectory';

@Component({
  selector: 'app-home',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent implements OnInit {
  public logger: winston.Logger;
  public alertSound: Howl;
  public showAll: boolean;
  public alert: StatAlert = new StatAlert();
  renderer: any = ipcRenderer;

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

  ngOnInit() {}

  setAlertWindowColors() {
    this.logger.info(`Alert level is ${this.alert.alertLevel}`);
    const at = `${this.alert.alertLevel.toLowerCase()}Alert`;
    const atText = at + 'Text';
    $('#alertWindow')
      .removeClass('gradientBackground')
      .addClass(at);
    $('#title').addClass(at);
    $('#narrative').addClass(atText);
    $('#at').addClass(at);
    $('#as').addClass(at);
  }


}
