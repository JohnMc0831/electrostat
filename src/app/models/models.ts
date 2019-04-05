export class Preferences {
  constructor() {}
  isKiosk: boolean;
  numSecondsToDisplay: string;
  userAuthenticated: boolean;
  userName: string;
}

export class StatAlert {
  constructor() {}
  title: string;
  sent: Date;
  sentBy: string;
  narrative: string;
  Id: number;
  alertLevel: string;
  alertType: string;
  alertTime: string;
  sendAll: boolean;
  affectedVlans: string;
  affectedGroups: string;
  targets: string;
  showAll: boolean;
}

export class Location {
  title: string;
  description: string;
  hasVlans: boolean;
  vlans: any[];
}

export class User {
  name: string;
  account: string;
  email: string;
  groups: any[];
}

export class Vlan {
  name: string;
  description: string;
  range: string; // TODO:  look for IP address/range classes to use
  leases: any[]; // how deep should we go.. ;->
  owner: string;
}

export class Ack {
  AlertId: string;
  User: string;
  Device: string;
  time: Date;
  Account: string;
  AcknowledgedAt: Date;
}
