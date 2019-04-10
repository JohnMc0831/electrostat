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
import * as adal from 'adal-node';

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
  private AuthenticationContext = adal.AuthenticationContext;
  private adalLog = adal.Logging;

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


    this.adalLog.setLoggingOptions({
      level: 3,   // verbose
      log : function(level, message, error) {
        if (error) {
          that.logger.error(message);
        } else {
          that.logger.info(message);
        }
      }
    });

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

 async authMe() {
    const that = this;
    this.logger.info('Authenticating with user-provided credentials.');
    const authParameters = {
        tenant: 'FAHC.onmicrosoft.com',
        authorityHostUrl: 'https://login.windows.net',
        clientId: '64978961-b044-4f8a-b5a4-e812f5ab93ff',
        username: $('#userId').val().toString(),
        password: $('#userPass').val().toString()
      };

    const authorityUrl = authParameters.authorityHostUrl + '/' + authParameters.tenant;
    const resource = '00000002-0000-0000-c000-000000000000';
    const context = new this.AuthenticationContext(authorityUrl);

    context.acquireTokenWithUsernamePassword(resource, authParameters.username, authParameters.password,
      authParameters.clientId, async function(err, tokenResponse: adal.TokenResponse) {
      if (err) {
        that.logger.error('well that didn\'t work: ' + err.stack);
        $('#userId').removeClass('authenticated').addClass('notAuthenticated');
        $('#userPass').removeClass('authenticated').addClass('notAuthenticated');
      } else {
        that.logger.info(`Successfully authenticated with token:  ${tokenResponse.accessToken}`);
        let groups: any;
        const graphUrl = 'https://graph.microsoft.com/v1.0/me/memberOf';
        fetch(graphUrl, { method: 'GET', headers: { 'Authorization': 'Bearer ' + tokenResponse.accessToken }
        }).then((response) => {
            response.json().then((res) => {
                groups = res.value;
                for (const grp of groups) {
                    this.logger.info(`Found group: ${grp.DisplayName}`);
                }
            });
        }).catch((error) => {
            this.logger.error(error);
        });

        that.logger.info(`Found ${groups.length()} group memberships for ${authParameters.username}`);
        $('#userId').removeClass('notAuthenticated').addClass('authenticated');
        $('#userPass').removeClass('notAuthenticated').addClass('authenticated');
      }
    });
  }
}
