import { Component, OnInit } from '@angular/core';
import * as $ from 'jquery';
import * as moment from 'moment';
import { StatAlert } from '../../models/models';
import {catService, catProd } from '../../models/logging';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor() { }
  public alert: StatAlert = new StatAlert();

  ngOnInit() {
    catProd.info('running inside ngOnInit()');
    catProd.info('Generating sample alert.');
    this.alert.title = 'Test Alert!';
    this.alert.narrative = '<p>Test alert!</p>';
    this.alert.alertTime = moment().format('MM/DD/YYYY hh:mm:ss A');
  }

}
