'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { Cluster, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require("./clusters/TuyaSpecificCluster");

Cluster.addCluster(TuyaSpecificCluster);
const dataTypes = {
  raw: 0,
  bool: 1,
  value: 2,
  string: 3,
  enum: 4,
  bitmap: 5,
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
  let value = 0;

  for (let i = 0; i < chunks.length; i++) {
    value = value << 8;
    value += chunks[i];
  }

  return value;
};

const getDataValue = (dpValue) => {
  switch (dpValue.datatype) {
    case dataTypes.raw:
      return dpValue.data;
    case dataTypes.bool:
      return dpValue.data[0] === 1;
    case dataTypes.value:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    case dataTypes.string:
      let dataString = '';
      for (let i = 0; i < dpValue.data.length; ++i) {
        dataString += String.fromCharCode(dpValue.data[i]);
      }
      return dataString;
    case dataTypes.enum:
      return dpValue.data[0];
    case dataTypes.bitmap:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
  }
}

module.exports = class SenoroWin extends ZigBeeDevice {

   _transactionID = 0;
    
    set transactionID(val) {
        this._transactionID = val % 256;  // Ensure transaction ID stays within the range
    }

    get transactionID() {
        return this._transactionID;
    }

  async onMeshInit() {
    this.log("onNodeInit");
  }

  async onNodeInit({ zclNode }) {
    this.enableDebug();
    this.printNode();

    this.addCapability("alarm_opened_capability");
    this.addCapability("closed_capability");
    this.addCapability("alarm_tilted_capability");
    this.addCapability("alarm_tamper");
    this.addCapability("measure_battery");
    
    // this.registerCapability('alarm_tamper_capability', TuyaSpecificCluster, {
    //   set: 'datapoint',
    //   setParser(value) {
    //     this.transactionId = (this.transactionId + 1) % 256 || 1;
    //     return {
    //       status: 0,
    //       transid: this.transactionId,
    //       dp: 16, // Tuya-Datapoint für Tamper
    //       datatype: 1, // bool
    //       length: 1,
    //       data: Buffer.from([value ? 1 : 0]),
    //     };
    //   },
    // });


    zclNode.endpoints[1].clusters.tuya.on("response", value => this.processResponse(value));
    zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processReporting(value));
    zclNode.endpoints[1].clusters.tuya.on("datapoint", value => this.processDatapoint(value));

    this.registerCapabilityListener('alarm_tamper_capability', async () => {
      this.log('Alarm tamper capability triggered');
      const tamperCapability = this.getCapabilityValue('alarm_tamper_capability');
      if (tamperCapability === true) {
        //this.setCapabilityValue('alarm_tamper_capability', false).catch(this.error);
        //this.setClusterCapabilityValue('alarm_tamper_capability', false, TuyaSpecificCluster).catch(this.error);
        await this.writeBool(16, false);
        this.log('Alarm tamper capability set to false');        
      }
    });
  }

  async writeBool(dp, value) {
        const data = Buffer.alloc(1);
        data.writeUInt8(value ? 0x01 : 0x00, 0);
        try {
            return await this.zclNode.endpoints[1].clusters.tuya.datapoint({
                status: 0,
                transid: this.transactionID++,
                dp,
                datatype: 1,  // Boolean datatype
                length: 1,
                data
            });
        } catch (err) {
            this.error(`Error writing boolean to dp ${dp}:`, err);
        }
    }

  async getConditionValue(args) {
    const openedCapability = this.getCapabilityValue('alarm_opened_capability');
    const closedCapability = this.getCapabilityValue('closed_capability');
    const tiltedCapability = this.getCapabilityValue('alarm_tilted_capability');

    if (args === '0' && openedCapability === true) {
      return true;
    }

    if (args === '1' && closedCapability === true) {
      return true;
    }

    if (args === '2' && tiltedCapability === true) {
      return true;
    }

    return false;
  }

  getState(state) {
    if (state === 0) {
      return 'opened';
    }
    else if (state === 1) {
      return 'closed';
    }
    else if (state === 2) {
      return 'tilted';
    }
    else {
      return 'unknown';
    }
  }

  async processResponse(data) { // Based on the syren driver
    const dp = data.dp;
    const value = getDataValue(data);
    this.log('received data: ', data, ' dp: ', dp, ' value: ', value);
    switch (dp) {
      case 101:
        this.log('State is ', this.getState(value));
        if (value === 0) {
          this.setCapabilityValue('alarm_opened_capability', true).catch(this.error);
          this.setCapabilityValue('closed_capability', false).catch(this.error);
          this.setCapabilityValue('alarm_tilted_capability', false).catch(this.error);

          this.triggerFlow({ id: 'opened' }).catch(this.error);
          this.triggerFlow({ id: 'state_changed' }).catch(this.error);
        }
        else if (value === 1) {
          this.setCapabilityValue('closed_capability', true).catch(this.error);
          this.setCapabilityValue('alarm_opened_capability', false).catch(this.error);
          this.setCapabilityValue('alarm_tilted_capability', false).catch(this.error);

          this.triggerFlow({ id: 'closed' }).catch(this.error);
          this.triggerFlow({ id: 'state_changed' }).catch(this.error);
        }
        else if (value === 2) {
          this.setCapabilityValue('alarm_tilted_capability', true).catch(this.error);
          this.setCapabilityValue('closed_capability', false).catch(this.error);
          this.setCapabilityValue('alarm_opened_capability', false).catch(this.error);

          this.triggerFlow({ id: 'tilted' }).catch(this.error);
          this.triggerFlow({ id: 'state_changed' }).catch(this.error);
        }
        else {
          this.log('Unknown state: ', value);
        }
        break;

      case 16:
        this.log('Alarm tamper is ', value);
        this.setCapabilityValue('alarm_tamper', value).catch(this.error);
        this.setCapabilityValue('alarm_tamper_capability', value).catch(this.error);
        break;

      case 2:
        const batteryPct = Math.min(100, Math.round((value * 100) / 255));
        this.log('Battery percentage is ', batteryPct);
        this.setCapabilityValue('measure_battery', batteryPct).catch(this.error);
        break;
      default:
        this.error(`WARN: NOT PROCESSED Tuya cmd: dp='${dp}' value='${measuredValue}' descMap.data='${JSON.stringify(data)}'`);
        this.log('WARN: NOT PROCESSED Tuya cmd: dp=', dp, 'value=', measuredValue, 'descMap.data = ', data);
        break;
    }
  }

  processReporting(data) {
    this.log("########### Reporting: ", data);
  }

  processDatapoint(data) {

  }

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    super.onInit();
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    super.onAdded();
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    super.onRenamed(name);
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    super.onDeleted();
  }
};
