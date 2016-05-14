var request = require("request");
var Service, Characteristic;
var exec = require('child_process').exec;
var net = require('net');

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-harman-kardon-avr", "Harman Kardon AVR", HarmanKardonAVRAccessory);
}

function HarmanKardonAVRAccessory(log, config) {
  this.log          = log;
  this.name         = config["name"];
  this.model_name   = config["model_name"] || "AVR 161";
  this.manufacturer = config["manufacturer"] || "Harman Kardon";    
}

HarmanKardonAVRAccessory.prototype = {
  setPowerState: function(powerOn, callback) {
    var that        = this;
    var command     = powerOn ? that.on_command : that.off_command;
    if (this.power_state == "off" && powerOn) {
      this.power_state = "on"
      exec(this.on_command, function(error, stdout, stderr) {
        // command output is in stdout
      });
    } else if (this.power_state == "on" && !powerOn) {
      this.power_state = "off"
      exec(this.off_command, function(error, stdout, stderr) {
        // command output is in stdout
      });
    }
     fs.writeFile("/home/pi/"+this.name+".log", this.power_state, function(err) {
    if(err) {
        return console.log(err);
    }


}); 
    callback()
  },

  setPowerStateFan: function(powerOn, callback) {
    var that        = this;
    var command     = powerOn ? that.speed_1 : that.speed_0;
    if (this.speedIndex == 0 && powerOn) {
      this.speedIndex = 1
      exec(command, function(error, stdout, stderr) {
        // command output is in stdout
      });
    } else if (this.speedIndex == 1 && !powerOn) {
      this.speedIndex = 0
      exec(command, function(error, stdout, stderr) {
        // command output is in stdout
      });
    }
    callback()
  },
      
  getPowerState: function(callback) {
    var that        = this;
    this.log("Current state: " + (this.power_state ? "On." : "Off."));
    var isOn;
    if (this.power_state == "off"){
        isOn = 0;
    } else {
        isOn = 1;
    }
    callback(null, isOn);
  },
  
  getPowerStateFan: function(callback) {
    var that        = this;
    this.log("Current FanState: " + (this.speedIndex ? "On." : "Off."));
    var isOn;
    if (this.speedIndex == 0){
        isOn = 0;
    } else {
        isOn = 1;
    }  
    callback(null, isOn);
  },    

  getRotationSpeed: function(callback) {
    var that        = this;  
    callback(null, (this.speedIndex / 3.0) * 100.0);
  },  

  setRotationSpeed: function(rotationSpeed, callback) {
    var that        = this;
    var cmd = this.speed_0;  
        if (rotationSpeed > 66.6) {
            this.speedIndex = 3;
            cmd = this.speed_3;
        } else if (rotationSpeed > 33.3) {
            this.speedIndex = 2;
            cmd = this.speed_2;
        } else if (rotationSpeed > 8) {
            this.speedIndex = 1;
            cmd = this.speed_1;
        } else if (rotationSpeed = 0) {
            this.speedIndex = 0;
            cmd = this.speed_0;
        }
      this.log("Set rotationSpeed to: " + this.speedIndex + " ->" + rotationSpeed);
      exec(cmd , function(error, stdout, stderr) {
        // command output is in stdout
      });
    callback(null, (this.speedIndex / 3.0) * 100.0);
  },
    
  identify: function(callback) {
      this.log('Identify requested!');
      callback(); // success
    },    
    
  getServices: function() {
    this.log("Register new " + this.type + " Service");
      
    var availableServices = [];  
    var informationService = new Service.AccessoryInformation();
    
    availableServices.push(informationService);
      
    informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model_name)
      .setCharacteristic(Characteristic.SerialNumber, this.model_name);
           
    if (this.type == "Switch") {    
      var switchService = new Service.Switch(this.name);
      availableServices.push(switchService);    

      switchService
      .getCharacteristic(Characteristic.On)
      .on('set', this.setPowerState.bind(this));

      
    }
      
    if (this.type == "Fan") {

      var fanService = new Service.Fan(this.name);
      availableServices.push(fanService);    

      fanService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getPowerStateFan.bind(this))
        .on('set', this.setPowerStateFan.bind(this));

      fanService
        .getCharacteristic(Characteristic.RotationSpeed)
        .on('get', this.getRotationSpeed.bind(this))
        .on('set', this.setRotationSpeed.bind(this));
        
      if (this.fanLight == "yes") {
        var lightbulbService = new Service.Lightbulb(this.name+" Licht");
        availableServices.push(lightbulbService);
        
        lightbulbService
            .getCharacteristic(Characteristic.On)
            .on('get', this.getPowerState.bind(this))
            .on('set', this.setPowerState.bind(this));

       }          
    }
      return availableServices;
  }
}
