import { app, BrowserWindow, remote, ipcRenderer, Tray, Menu } from 'electron';
import { Component, OnInit } from '@angular/core';
import * as $ from 'jquery';
import * as moment from 'moment';
import { StatAlert } from '../../models/models';
import { ConsoleForElectron } from 'winston-console-for-electron';
import * as winston from 'winston';
import * as signalR from '@aspnet/signalr';
import * as path from 'path';
import {ElectronService} from 'ngx-electron';
import {Howl, Howler} from 'howler';
import fetch from 'electron-fetch';
import * as ip from 'ip';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public logger: winston.Logger;
  public alertSound: Howl;
  public showAll: boolean;

  constructor(private electronSvc: ElectronService) {
    const tempPath = remote.app.getPath('temp');
    const logPath = path.join(tempPath, 'electoStat.log');
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [
        new winston.transports.File({
          filename: logPath,
          format:
            winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({
                format: 'MM-DD-YYYY HH:mm:ss'
              }),
              winston.format.printf(info => `${info.timestamp}: ${info.message}`)
          )
        }),
        new ConsoleForElectron({
          format:
            winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({
                format: 'MM-DD-YYYY HH:mm:ss'
              }),
              winston.format.printf(info => `${info.timestamp}: ${info.message}`)
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
      this.showAll = this.electronSvc.ipcRenderer.sendSync('mainChannel', 'showAll');
      this.logger.info(`showAllAlerts is ${this.alert.showAll}`);
      const inScope: boolean = this.amIInScope();
      if (this.showAll || inScope) {
        this.displayAlert();
      } else {
        this.logger.info(`Not displaying the alert with title ${this.alert.title} as this device and/or user is not in scope.`);
      }
    });
  }

  amIInScope() {
    const that = this;

      this.showAll = this.electronSvc.ipcRenderer.sendSync('mainChannel', 'showAll');
      if (this.showAll) {
        that.logger.info('The user has opted to display ALL alerts.  This alert WILL be displayed!');
        return true;
      }
     // Alert was sent everywhere.
     if (this.alert.sendAll) {
        that.logger.info('This alert has the sendAll flag set.  It WILL be shown!');
         return true;
     }

     // Location scope
     const address: string = ip.address();
     that.logger.info(`Current IP Address: ${address}`);
     this.alert.affectedVlans = '10.32.73.0,10.32.74.0';
     this.alert.affectedGroups = 'IT Staff';
     if (address && this.alert.affectedVlans) {
        that.logger.info('This alert is intended to displayed only in certain locations.');
        that.logger.info('Evaluating whether this location is in scope...');
        const lastDot = address.lastIndexOf('.');
        const subnet = address.substr(0, lastDot) + '.0';
        that.logger.info(`Device subnet is ${subnet}.`);
        if (this.alert.affectedVlans.includes(subnet)) {
            that.logger.info(`Matched VLAN/Subnet: ${subnet}.  The alert WILL be displayed.`);
            return true;  // Shows the alert
        }
     }

     if (this.alert.affectedGroups) {
        const grps = this.alert.affectedGroups.split(',');
        grps.forEach (function(value) {
        that.logger.info(`User is a member of targeted in-scope group <strong>${value}</strong>.  The alert WILL be shown!`);
        return true;
        });
     }

     // Active Shooter Drill
    //  const targets = this.alert.targets.split(',');
    //  // Get current user's email address
    //  const mail = 'john.mcconnell@uvmhealth.org'; // how to get this on Mac/Linux?
    //  targets.forEach(function(value) {
    //   if (value === mail) {
    //     return true; // participating in the drill
    //   }
    //  });

     return false;
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
      const inScope: boolean = that.amIInScope();
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
