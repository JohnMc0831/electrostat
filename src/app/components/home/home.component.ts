import { app, BrowserWindow, remote, ipcRenderer } from 'electron';
import { Component, OnInit } from '@angular/core';
import * as $ from 'jquery';
import * as moment from 'moment';
import { StatAlert } from '../../models/models';
import * as winston from 'winston';
import * as signalR from '@aspnet/signalr';
import * as path from 'path';
import {ElectronService} from 'ngx-electron';
import {Howl, Howler} from 'howler';
import fetch from 'electron-fetch';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public logger: winston.Logger;
  public alertSound: Howl;

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
      if (msg.indexOf('showLastAlert') > -1) {
        this.logger.info('showLastAlert received from ipcMain!');
        // play sound only if option is enabled
        if (msg.indexOf('Sound') > -1) {
          const sound = new Howl({
            src: ['./assets/Bleep.mp3']
          });
          Howler.volume(1.0);
          sound.play();
        }
        this.getLastAlert();
      }
    });
  }

  initSignalR() {
    const that = this;
    this.logger.info('Initializing signalR client');
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('https://stat.uvmhealth.org/alertHub')
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connection.start().then(function () {
      that.logger.info('signalR sub-system is now connected...');
    }).catch((err) => {
      that.logger.error(`An exception occurred starting the signalR client: ${err}`);
    });

    // start listening for alerts
    connection.on('broadcastAlert', (alert) => {
      this.alert = alert;
      this.displayAlert();
    });
  }

  displayAlert() {
    this.logger.info(`Stat alert received at ${moment().format('MM/DD/YYYY hh:mm:ss a')}.`);
    this.logger.info(`Alert Title: ${this.alert.title}`);
    $('#title').text(this.alert.title);
    this.logger.info(`Received alert!`);
    $('#title').text(this.alert.title);
    $('#narrative').html(this.alert.narrative);
    $('#alertType').text(this.alert.alertLevel);
    $('#alertSent').text(moment(this.alert.alertTime).format('MM/DD/YYYY hh:mm:ss a'));
    this.setAlertWindowColors();
    const win = remote.getCurrentWindow();
    win.show();
  }

  ackAlert() {
    const win = remote.getCurrentWindow();
    win.hide();
    // TODO:  Actually ack the alert via signalR
  }

  getLastAlert() {
    const that = this;
    this.logger.info('Getting most recent alert from REST API.');
    $.ajax({
      url: 'https://stat.uvmhealth.org/api/alerts/mostrecent/',
      async: true,
      dataType: 'json',
      type: 'GET'
    }).always(function (alert) {
      that.logger.info(`Retrieved alert ${alert}.`);
      that.alert = alert;
      that.logger.info(`Stat alert received at ${moment().format('MM/DD/YYYY hh:mm:ss a')}.`);
      that.logger.info(`Alert Title: ${that.alert.title} was sent at ${that.alert.alertTime}`);
      that.displayAlert();
    });
  }

  setAlertWindowColors() {
    this.logger.info(`Alert level is ${this.alert.alertLevel}`);
    const at = `${this.alert.alertLevel.toLowerCase()}Alert`;
    const atText = at + 'Text';
    $('#alertWindow').removeClass('gradientBackground').addClass(at);
    $('#title').addClass(at);
    $('#narrative').addClass(atText);
    $('#at').addClass(at);
    $('#as').addClass(at);
  }
}
