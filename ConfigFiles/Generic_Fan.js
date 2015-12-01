// First parameter  = Parm1 = Accessory name
// Second parameter = Parm2 = Command string to switch accessory on
// Third parameter  = Parm3 = Command string to switch accessory off
// Fourth parameter = Parm4 = Configuration details
 
var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var fs = require('fs');

// here's a fake hardware device that we'll expose to HomeKit
var FAKE_FAN = {
  powerOn: false,
  setPowerOn: function(on) { 
    console.log("Turning the Parm1 fan %s...", on ? "on" : "off");
 	if (on) {
       fs.appendFile("/var/www/data/input.txt", "Parm2", function(err) {		
          if(err) { return console.log(err); }
          console.log("...Parm1 fan is now on.");
       }); 
    } else {
       fs.appendFile("/var/www/data/input.txt", "Parm3", function(err) {
          if(err) { return console.log(err); }
          console.log("...Parm1 fan is now off.");
   	   });
	}
  },
    identify: function() {
// We are just going to stuff a shed load of individual on's and off's into the queue to be processed by the alarm service.
// These will be processed sequentially, so will create the effect of flashing the fan to identify it.
// The downside of this approach is that the event logs will record each command individually.
    console.log("Identify the Parm1 fan.");
	    for (var i=0; i<4; i++) {
	        for(var j=0; j<3; j++){
                fs.appendFile("/var/www/data/input.txt", "Parm2", function(err) {		
                   if(err) { return console.log(err); }
	            });
	    	}
	        for(var j=0; j<1; j++){
                fs.appendFile("/var/www/data/input.txt", "Parm3", function(err) {		
                   if(err) { return console.log(err); }
	            });
			}
        }
    }
}

// Generate a consistent UUID for our fan Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the accessory name.
var FanUUID = uuid.generate('hap-nodejs:accessories:Parm1');

// This is the Accessory that we'll return to HAP-NodeJS that represents our fake fan.
var Fan = exports.accessory = new Accessory('Parm1', FanUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
Fan.username = "1A:2B:3C:4D:5E:FF";
Fan.pincode = "031-45-154";

// set some basic properties (these values are arbitrary and setting them is optional)
Fan
  .getService(Service.AccessoryInformation)
  .setCharacteristic(Characteristic.Manufacturer, "oddwires.co.uk")
  .setCharacteristic(Characteristic.Model, "Rev-1")
  .setCharacteristic(Characteristic.SerialNumber, "Parm4");

// listen for the "identify" event for this Accessory
Fan.on('identify', function(paired, callback) {
  FAKE_FAN.identify();
  callback(); // success
});

// Add the actual fan Service and listen for change events from iOS.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
Fan
  .addService(Service.Fan, "Parm1") // services exposed to the user should have "names" like "Fake fan" for us
  .getCharacteristic(Characteristic.On)
  .on('set', function(value, callback) {
    FAKE_FAN.setPowerOn(value);
    callback(); // Our fake fan is synchronous - this value has been successfully set
  });

// We want to intercept requests for our current power state so we can query the hardware itself instead of
// allowing HAP-NodeJS to return the cached Characteristic.value.
Fan
  .getService(Service.Fan)
  .getCharacteristic(Characteristic.On)
  .on('get', function(callback) {
    // this event is emitted when you ask Siri directly whether your fan is on or not. you might query
    // the fan hardware itself to find this out, then call the callback. But if you take longer than a
    // few seconds to respond, Siri will give up.
    console.log("Checking the Parm1 fan status...");	
    var err = null;                         // in case there were any problems
    fs.readFile("/var/www/data/status.txt", 'utf8', function(err, data) {
        if(err) { return console.log(err); }
	    var lines = data.split('\n');
        for(var i = 0; i < lines.length; i++){
		    if ((lines[i].indexOf("rcon") !=-1) && (lines[i].indexOf("Parm1") !=-1)) {
                var svalues = lines[i].split(':');
				if (svalues[5].toString().trim() === 'on') {
					FAKE_FAN.powerOn = true;
				    console.log("...Parm1 fan is on");
					callback(null, FAKE_FAN.powerOn);
                } else {
					FAKE_FAN.powerOn = false;
				    console.log("...Parm1 fan is off");
					callback(null, FAKE_FAN.powerOn);
                }
			}
		}		
 	});
});	