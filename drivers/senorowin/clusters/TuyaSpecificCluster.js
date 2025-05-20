'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

const ATTRIBUTES = {};
const COMMANDS = {
  datapoint: {
    id: 0,
    args: {
      status: ZCLDataTypes.uint8,
      transid: ZCLDataTypes.uint8,
      dp: ZCLDataTypes.uint8,
      datatype: ZCLDataTypes.uint8,
      length: ZCLDataTypes.data16,
      data: ZCLDataTypes.buffer
    }
  },
  
  reporting: {
    id: 0x01,
    args: {
      status: ZCLDataTypes.uint8,
      transid: ZCLDataTypes.uint8,
      dp: ZCLDataTypes.uint8,
      datatype: ZCLDataTypes.uint8,
      length: ZCLDataTypes.data16,
      data: ZCLDataTypes.buffer
    }
  },
   
  response: {
    id: 0x02,
    args: {
      status: ZCLDataTypes.uint8,
      transid: ZCLDataTypes.uint8,
      dp: ZCLDataTypes.uint8,
      datatype: ZCLDataTypes.uint8,
      length: ZCLDataTypes.data16,
      data: ZCLDataTypes.buffer
    }
  },
  
  reportingConfiguration: {
    id: 0x06,
    args: {
      status: ZCLDataTypes.uint8,
      transid: ZCLDataTypes.uint8,
      dp: ZCLDataTypes.uint8,
      datatype: ZCLDataTypes.uint8,
      length: ZCLDataTypes.data16,
      data: ZCLDataTypes.buffer
    }
  },
};

class TuyaSpecificCluster extends Cluster {

  static get ID() {
    return 0xEF00; // manuSpecificTuya
  }

  static get NAME() {
    return 'tuya';
  }

  static get COMMANDS() {
    return COMMANDS;
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  onReporting(response) {
    this.emit('reporting', response);
  }

  onResponse(response) {
    this.emit('response', response);
  }

  onReportingConfiguration(response) {
    this.emit('reportingConfiguration', response);
  }
}

module.exports = TuyaSpecificCluster;