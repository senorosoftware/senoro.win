'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SenoroWinDriver extends ZigBeeDriver {

    onInit() {
        super.onInit();
        this.stateConditionCard = this.homey.flow.getConditionCard("state_condition");
        this.stateConditionCard.registerRunListener(async (args, state) => {
            const value = await args.device.getConditionValue(args.when);            
            return value;
        });
    }

}

module.exports = SenoroWinDriver;