import { app, BrowserWindow, remote, ipcRenderer, Tray, Menu } from 'electron';
import { Component, OnInit, NgModuleFactoryLoader } from '@angular/core';
import * as path from 'path';
import * as url from 'url';
import * as $ from 'jquery';
import { ConsoleForElectron } from 'winston-console-for-electron';
import * as winston from 'winston';
import { ElectronService } from 'ngx-electron';
import { Howl, Howler } from 'howler';
import fetch from 'electron-fetch';
import * as ip from 'ip';
import { HOST_ATTR } from '@angular/platform-browser/src/dom/dom_renderer';
import * as jetpack from 'fs-jetpack';
import { Preferences } from '../../models/models';

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
  public prefs: Preferences = new Preferences();
  private userAuthenticated = false;
  public userSettingsFolder = remote.app.getPath('userData');
  public configFile = path.join(this.userSettingsFolder, 'electroStatPreferences.json');

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
    const that = this;
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

    $('#btnSavePrefs').on('click', function(e) {
      that.logger.info('User requested a Save on Preferences!');
      that.savePreferences();
      that.electronSvc.ipcRenderer.sendSync('prefsChannel', 'closePreferences');
    });

    $('#btnCancelPrefs').on('click', function(e) {
      that.logger.info('Sending cancellatioun message from Preferences!');
      that.electronSvc.ipcRenderer.sendSync('prefsChannel', 'cancelPreferences');
    });

    $('#chkIsKiosk').on('click', function() {
      if ($('#chkIsKiosk').is(':checked')) {
        $('#numSecondsToShow').val(5);
        $('#numSecondsToShow').prop('disabled', false);
      } else {
        $('#numSecondsToShow').val('');
        $('#numSecondsToShow').prop('disabled', true);
      }
    });

    this.readPreferences();
  }

  savePreferences() {
    this.logger.info(`Saving electroStat client configuration preferences to settings file: ${this.configFile}`);
    this.prefs.isKiosk = $('#chkIsKiosk').is(':checked');
    this.prefs.numSecondsToDisplay = this.prefs.isKiosk ? $('#numSecondsToShow').val().toString() : '';
    this.prefs.userAuthenticated = this.userAuthenticated;
    this.prefs.userName = $('#userId').val().toString();
    const jsonPrefs = JSON.stringify(this.prefs);
    jetpack.write(this.configFile, jsonPrefs, { 'jsonIndent': 4});
    this.logger.info(`Wrote electroStat client configuration preferences to settings file successfully!`);
  }

  readPreferences() {
    this.prefs = jetpack.read(this.configFile, 'json');
    if (this.prefs.isKiosk) {
      $('#chkIsKiosk').prop('checked', true);
      $('#numSecondsToShow').val(this.prefs.numSecondsToDisplay);
      $('#numSecondsToShow').prop('disabled', false);
    } else {
      $('#chkIsKiosk').prop('checked', false);
      $('#numSecondsToShow').val('');
      $('#numSecondsToShow').prop('disabled', true);
    }
    this.logger.info('Set preferences to last saved configuration.');
  }
}
