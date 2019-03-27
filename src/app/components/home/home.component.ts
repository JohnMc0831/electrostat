import { app, BrowserWindow, remote, ipcRenderer } from 'electron';
import { Component, OnInit } from '@angular/core';
import * as $ from 'jquery';
import * as moment from 'moment';
import { StatAlert } from '../../models/models';
import * as winston from 'winston';
import * as signalR from '@aspnet/signalr';
import * as path from 'path';
import {ElectronService} from 'ngx-electron';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public logger: winston.Logger;
  constructor(private electronSvc: ElectronService) {
    // const tempDir = app.getPath('temp');
    const logPath = './electoStat.log';
    this.logger = winston.createLogger({
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
   }
  public alert: StatAlert = new StatAlert();
  renderer: any = ipcRenderer;

  ngOnInit() {
    if (this.electronSvc.isElectronApp) {
      this.logger.info('Awakening ipcRenderer...');
      const imUp: string = this.electronSvc.ipcRenderer.sendSync('mainChannel', 'readyForAlerts');
      this.logger.info(`ipcRenderer is awake!`);
    }
    this.initSignalR();
    ipcRenderer.on('mainChannel', (event, msg) => {
      // TODO: show the alert
      if (msg === 'showLastAlert') {
        this.logger.info('showLastAlert received from ipcMain!');
      }
    });
  }

  initSignalR() {
    this.logger.info('Initializing signalR client');
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('https://stat.uvmhealth.org/alertHub')
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connection.start().then(function () {
      this.logger.info('signalR sub-system is now connected...');
    }).catch((err) => {
      this.logger.error(`An exception occurred starting the signalR client: ${err}`, err);
    });

    // start listening for alerts
    connection.on('broadcastAlert', (alert) => {
      this.displayAlert(alert);
    });
  }

  displayAlert(alert: StatAlert) {
    this.logger.info(`Stat alert received at ${moment().format('MM/DD/YYYY hh:mm:ss a')}.`);
    this.alert = alert;
    $('#alertWindow').removeClass('gradientBackground').addClass('emergentAlert');
    const win = remote.getCurrentWindow();
    win.show();
  }

  seeLastAlert() {
    // TODO: pass this from ipcMain to ipcRenderer
    this.logger.info('See Last Alert menuItem was clicked!');
  }
}
