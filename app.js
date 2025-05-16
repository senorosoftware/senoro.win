'use strict';

const Homey = require('homey');

module.exports = class MyApp extends Homey.App {  
  async onInit() {
    // if (process.env.DEBUG === '1'){
		// 		try{ 
		// 			require('inspector').waitForDebugger();
		// 		}
		// 		catch(error){
		// 			require('inspector').open(9225, '0.0.0.0', true);
		// 		}
		// }
    
    this.log('MyApp has been initialized');    
  }

};
