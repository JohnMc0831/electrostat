import { Component } from '@angular/core';
import { ElectronService } from './providers/electron.service';
import { TranslateService } from '@ngx-translate/core';
import { AppConfig } from '../environments/environment';
import * as winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console({
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
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(public electronService: ElectronService,
    private translate: TranslateService) {

    translate.setDefaultLang('en');
    logger.info(`AppConfig: ${AppConfig}`);

    if (electronService.isElectron()) {
      logger.info('Mode electron');
      logger.info('Electron ipcRenderer', electronService.ipcRenderer);
      logger.info('NodeJS childProcess', electronService.childProcess);
    } else {
      logger.info('Mode web');
    }
  }
}
