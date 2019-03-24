import { app, BrowserWindow, remote, ipcRenderer } from 'electron';
import { Component, OnInit } from '@angular/core';
import * as $ from 'jquery';
import * as moment from 'moment';
import { StatAlert } from '../../models/models';
import * as winston from 'winston';
import * as signalR from '@aspnet/signalr';
import * as path from 'path';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public logger: winston.Logger;
  constructor() {
    const tempDir = app.getPath('temp');
    const logPath = path.join(tempDir, 'statClient.log');
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
    this.initSignalR();

    this.renderer.on('showLastAlert', function(event, data) {
      this.logger.info('ipc message to show last alert received by renderer');
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
