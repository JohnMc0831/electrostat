import { app, BrowserWindow, remote, ipcRenderer, Tray, Menu } from 'electron';
import { Component, OnInit, NgModuleFactoryLoader } from '@angular/core';
import * as $ from 'jquery';
import * as moment from 'moment';
import { StatAlert, Ack } from '../../models/models';
import { ConsoleForElectron } from 'winston-console-for-electron';
import * as winston from 'winston';
import * as signalR from '@aspnet/signalr';
import * as path from 'path';
import { ElectronService } from 'ngx-electron';
import { Howl, Howler } from 'howler';
import fetch from 'electron-fetch';
import * as ip from 'ip';
import { HOST_ATTR } from '@angular/platform-browser/src/dom/dom_renderer';
import * as os from 'os';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public logger: winston.Logger;
  public alertSound: Howl;
  public showAll: boolean;
  public alert: StatAlert = new StatAlert();
  renderer: any = ipcRenderer;
  public connection = new signalR.HubConnectionBuilder()
  .withUrl('https://stat.uvmhealth.org/alertHub')
  .configureLogging(signalR.LogLevel.Information)
  .build();

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

  ngOnInit() {
    if (this.electronSvc.isElectronApp) {
      this.logger.info('Awakening ipcRenderer...');
      const imUp: string = this.electronSvc.ipcRenderer.sendSync(
        'mainChannel',
        'readyForAlerts'
      );
      this.logger.info(`communication to ipcMain completed!`);
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

    this.connection.start().then(function() {
        that.logger.info(
          'signalR sub-system is now connected to cloud-hosted service bus.'
        );
      })
      .catch(err => {
        that.logger.error(
          `An exception occurred starting the signalR client: ${err}`
        );
      });

    // start listening for alerts
    this.connection.on('broadcastAlert', alert => {
      this.alert = alert;
      this.showAll = this.electronSvc.ipcRenderer.sendSync(
        'mainChannel',
        'showAll'
      );
      this.logger.info(`showAllAlerts is ${this.alert.showAll}`);
      const inScope: boolean = this.amIInScope();
      if (this.showAll || inScope) {
        this.displayAlert();
      } else {
        this.logger.info(
          `Not displaying the alert with title ${
            this.alert.title
          } as this device and/or user is not in scope.`
        );
      }
    });
  }

  amIInScope() {
    const that = this;

    this.showAll = this.electronSvc.ipcRenderer.sendSync(
      'mainChannel',
      'showAll'
    );
    if (this.showAll) {
      that.logger.info(
        'The user has opted to display ALL alerts.  This alert WILL be displayed!'
      );
      return true;
    }
    // Alert was sent everywhere.
    if (this.alert.sendAll) {
      that.logger.info(
        'This alert has the sendAll flag set.  It WILL be shown!'
      );
      return true;
    }

    // Location scope
    const address: string = ip.address();
    that.logger.info(`Current IP Address: ${address}`);
    this.alert.affectedVlans = '10.32.74.0';
    if (address && this.alert.affectedVlans) {
      that.logger.info(
        'This alert is intended to displayed only in certain locations.'
      );
      that.logger.info('Evaluating whether this location is in scope...');
      const lastDot = address.lastIndexOf('.');
      const subnet = address.substr(0, lastDot) + '.0';
      that.logger.info(`Device subnet is ${subnet}.`);
      if (this.alert.affectedVlans.includes(subnet)) {
        that.logger.info(
          `Matched VLAN/Subnet: ${subnet}.  The alert WILL be displayed.`
        );
        return true;
      } else {
        that.logger.info(`Found no matching VLAN/Subnet: ${subnet}!`);
      }
    }

    // Groups scope
    // Get the current user
    // So, I'm pretty sure that this will work in Windows, but I really have no idea
    // yet on how to handle on OS X / Linux...hmmm....
    const username = process.env.username || process.env.user;
    this.logger.info(`Current user: ${username}`);
    const config = {
      scope: 'sub',
      includeMembership: ['user'],
      url: 'ldap://fahc.fletcherallen.org',
      baseDN: 'dc=fahc,dc=fletcherallen,dc=org',
      username: 'a212502@uvmhealth.org',
      password: 'Tits&wine!' // <-- I hexedited the compiled binary and this is properly obfuscated.
    };
    const ActiveDirectory = require('activedirectory');
    const ad = new ActiveDirectory(config);
    // ad.findUser(username, function(err, u) {
    //   if (err) {
    //     that.logger.error(`Error: ${err}`);
    //   } else {
    //     that.logger.info(`Retrieved user: ${JSON.stringify(u)}`);
    //   }
    //   that.logger.info('AD call completed.');
    // });

    that.logger.info(
      `Checking to see if group targeted applies to this user: ${username}.`
    );
    that.alert.affectedGroups = '.IS Leadership,FAHC Staff';
    ad.findUser('m212502', function(err, usr) {
      if (err) {
        that.logger.error(`Error connecting to AD: ${err}`);
      }

      if (usr) {
        if (that.alert.affectedGroups) {
          const grps = that.alert.affectedGroups.split(',');
          grps.forEach(function(grp) {
            // for every group targeted by the alert
            ad.isUserMemberOf(usr, grp, function(e, isMember) {
              if (err) {
                that.logger.error(
                  `An error occurred determining is ${username} is a member of ${grp}:  ${e}`
                );
                return;
              }
              that.logger.info(
                `${username} is a member of ${grp}:  ${isMember}`
              );
              if (isMember) {
                return true;
              }
            });
          });
        }
      } else {
        that.logger.error('User object is null!  Lookup failed!');
      }
    });

    // Active Shooter Drill
    // let mail: string;
    // ad.findUser(username, function(err, user) {
    //   if (err) {
    //     that.logger.error(`Couldn't find user ${username}!  Exception: ${err}.`);
    //     return false;
    //   }

    //   if (!user) {
    //     that.logger.error(`Couldn't find user ${username}!`);
    //     return false;
    //   }
    //   // get current user's email address
    //   mail = user.mail;
    // });

    // const targets = this.alert.targets.split(',');
    // targets.forEach(function(value) {
    // if (value === mail) {
    //   return true; // participating in the drill
    // }
    // });

    return false; // no alert for you!
  }

  displayAlert() {
    this.logger.info(
      `Stat alert received at ${moment().format('MM/DD/YYYY hh:mm:ss a')}.`
    );
    this.logger.info(`Alert Title: ${this.alert.title}`);
    $('#title').text(this.alert.title);
    $('#narrative').html(this.alert.narrative);
    $('#alertType').text(this.alert.alertLevel);
    $('#alertSent').text(
      moment(this.alert.alertTime).format('MM/DD/YYYY hh:mm:ss a')
    );
    this.setAlertWindowColors();
    const win = remote.getCurrentWindow();
    win.show();
  }

  ackAlert() {
    let ack = new Ack();
    ack.Account = process.env.username || process.env.user;
    ack.AcknowledgedAt = moment().format("MM/DD/YYYY hh:mm:ss a");
    ack.AlertId = this.alert.id.toString();
    ack.Device =  os.hostname();
    ack.time = new Date();
    this.logger.info('Creating acknowledgement object with the following props:');
    this.logger.info(`Alert ID: ${ack.AlertId}`);
    this.logger.info(`Acknowledging Account: ${ack.Account}`);
    this.logger.info(`Acknowledged at: ${ack.AcknowledgedAt}`);
    this.logger.info(`From Device: ${ack.Device}`);
    this.connection.send('AckAlert', ack).catch((exception) => {
      if (exception) {
        this.logger.error(`AckAlert SignalR message failed to send: ${exception}`);
      } else {
        this.logger.info('AckAlert SignalR message sent!');
      }
    });
    const win = remote.getCurrentWindow();
    win.hide();
  }

  getLastAlert() {
    const that = this;
    this.logger.info('Getting most recent alert from REST API.');
    $.ajax({
      url: 'https://stat.uvmhealth.org/api/alerts/mostrecent/',
      async: true,
      dataType: 'json',
      type: 'GET'
    }).always(function(alert) {
      that.alert = alert;
      that.logger.info(`Alert ${alert.title} with id ${alert.id} was received at ${moment().format('MM/DD/YYYY hh:mm:ss a')}.`);
      const inScope: boolean = that.amIInScope();
      that.displayAlert();
    });
  }

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
