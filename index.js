'use strict';

var Service, Characteristic, UUIDGen
var net = require('net')
var pkg = require('./package.json');
var tcpp = require('tcp-ping');
var Poller = require('./lib/poller');

module.exports = function (homebridge) {
    Service = homebridge.hap.Service
    Characteristic = homebridge.hap.Characteristic
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerAccessory('homebridge-harman-kardon-avr', 'harman-kardon-avr', HarmanKardonAVRAccessory)
}

function HarmanKardonAVRAccessory(log, config) {
    // Config
    this.log = log
    this.name = config["name"]
    this.ip = config["ip"]
    this.port = config["port"] || 10025
    this.model_name = config["model_name"] || 'AVR 161'
    this.manufacturer = config["manufacturer"] || 'Harman Kardon'
    this.inputs = config["inputs"]
    this.interval = parseInt(config["interval"], 10) || 5;

    // Vars
    var that = this;
    var powerOn = false
    this.enabledServices = [];
    this.uuid = UUIDGen.generate(this.name)

    // Information Service
    this.informationService = new Service.AccessoryInformation();
    this.informationService
        .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
        .setCharacteristic(Characteristic.Model, this.model_name)
        .setCharacteristic(Characteristic.SerialNumber, this.uuid)
        .setCharacteristic(Characteristic.FirmwareRevision, pkg.version);

    this.enabledServices.push(this.informationService);

    // Television Service
    // Add the actual TV Service and listen for change events from iOS.
    // We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
    this.televisionService = new Service.Television(this.name, this.uuid);
    this.televisionService
        .setCharacteristic(Characteristic.ConfiguredName, this.name);

    this.televisionService
        .setCharacteristic(
            Characteristic.SleepDiscoveryMode,
            Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE
        );
    this.televisionService
        .getCharacteristic(Characteristic.Active)
        .on('set', function (newValue, callback, context) {
            if (context == 'update') {
                that.log("update Active => setNewValue: " + newValue);
                callback(null);
                return
            }

            that.log("set Active => setNewValue: " + newValue);
            var cmd = newValue ? 'power-on' : 'power-off';
            var client = new net.Socket()

            client.connect(that.port, that.ip, function () {
                client.write(that.buildRequest(cmd))
                client.destroy()
            })

            client.on('error', function (err) {
                that.log('Error setting Powerstate: ' + err.message)
            })

            callback(null, newValue)
        })
        .on('get', function (callback) {
            that.log("get State => " + powerOn);
            callback(null, powerOn)
        });

    this.televisionService
        .getCharacteristic(Characteristic.ActiveIdentifier)
        .on('set', function (newValue, callback) {
            that.log("set Active Identifier => setNewValue: " + newValue);

            var input = that.inputs[newValue - 1]
            var client = new net.Socket()

            client.connect(that.port, that.ip, function () {
                client.write(that.buildRequest('source-selection', input))
                client.destroy()
            })

            client.on('error', function (err) {
                that.log('Error setting Input: ' + err.message)
            })

            callback(null, newValue)
        });

    this.televisionService
        .getCharacteristic(Characteristic.RemoteKey)
        .on('set', function (newValue, callback) {
            that.log("set Remote Key => setNewValue: " + newValue);
            callback(null);
        });

    this.televisionService
        .getCharacteristic(Characteristic.PowerModeSelection)
        .on('set', function (newValue, callback) {
            that.log("set PowerModeSelection => setNewValue: " + newValue);
            callback(null);
        });

    this.enabledServices.push(this.televisionService);

    // Speaker Service
    this.speakerService = new Service.TelevisionSpeaker(this.name + "_Speaker_" + this.uuid)

    this.speakerService
        .setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
        .setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.ABSOLUTE);

    this.speakerService.getCharacteristic(Characteristic.VolumeSelector)
        .on('set', function (newValue, callback) {
            that.log("set VolumeSelector => setNewValue: " + newValue);
            var volume = newValue ? "volume-down" : "volume-up";

            var client = new net.Socket()

            client.connect(that.port, that.ip, function () {
                client.write(that.buildRequest(volume))
                client.destroy()
            })

            client.on('error', function (err) {
                that.log('Error setting Volume: ' + err.message)
            })

            callback(null, newValue);
        });

    this.speakerService.getCharacteristic(Characteristic.Mute)
        .on('get', function (newValue, callback) {
            that.log("get Mute => setNewValue: " + newValue);
            callback(null, false);
        })
        .on('set', function (newValue, callback) {
            that.log("set Mute => setNewValue: " + newValue);

            var client = new net.Socket()

            client.connect(that.port, that.ip, function () {
                client.write(that.buildRequest("mute-toggle"))
                client.destroy()
            })

            client.on('error', function (err) {
                that.log('Error setting Mute: ' + err.message)
            })

            callback(null, newValue);
        });

    this.televisionService.addLinkedService(this.speakerService);
    this.enabledServices.push(this.speakerService);

    // Input Service
    if (this.inputs && this.inputs.length != 0) {
        for (var index in this.inputs) {
            that.log(index + " -> " + this.inputs[index]);
            this.Identifier = index + 1
            this.Name = this.inputs[index]
            this.InputSourceType = "HDMI"
            this.InputDeviceType = "Playback"
            this.CurrentVisibilityState = "Shown"

            this.input = new Service.InputSource(this.Name, this.Name, that.uuid);
            this.input
                .setCharacteristic(Characteristic.Identifier, this.Identifier)
                .setCharacteristic(Characteristic.ConfiguredName, this.Name)
                .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
                .setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType[this.InputSourceType])
                .setCharacteristic(Characteristic.InputDeviceType, Characteristic.InputDeviceType[this.InputDeviceType])
                .setCharacteristic(Characteristic.CurrentVisibilityState, Characteristic.CurrentVisibilityState[this.CurrentVisibilityState])
                //.setCharacteristic(Characteristic.TargetVisibilityState, Characteristic.TargetVisibilityState[this.TargetVisibilityState])
                .on('set', function (newValue, callback) {
                    that.log("set InputSource => setNewValue: " + newValue);

                    var input = this.inputs[index]
                    var client = new net.Socket()

                    client.connect(that.port, that.ip, function () {
                        client.write(that.buildRequest('source-selection', input))
                        client.destroy()
                    })

                    client.on('error', function (err) {
                        that.log('Error setting Input: ' + err.message)
                    })
                });
            this.televisionService.addLinkedService(this.input);
            this.enabledServices.push(this.input);
        }
    }

    // Poller
    let poller = new Poller(this.interval * 1000);

    // Wait till the timeout sent our event to the EventEmitter
    poller.onPoll(() => {
        //console.log('triggered');
        tcpp.probe(that.ip, that.port, function (err, available) {
            //console.log(available);
            that.log("Available: ", available)
            powerOn = available;
            that.televisionService.getCharacteristic(Characteristic.Active).setValue(powerOn, undefined, 'update');
            poller.poll(); // Go for the next poll
        });
    });
    // Initial start
    poller.poll();
};

// https://github.com/KarimGeiger/HKAPI
HarmanKardonAVRAccessory.prototype.buildRequest = function (cmd, para) {
    var request = ''
    var payload = '<?xml version="1.0" encoding="UTF-8"?> <harman> <avr> <common> <control> <name>' + cmd + '</name> <zone>Main Zone</zone> <para>' + para + '</para> </control> </common> </avr> </harman>'
    request += 'POST HK_APP HTTP/1.1\r\n'
    request += 'Host: :' + this.ip + '\r\n'
    request += 'User-Agent: Harman Kardon AVR Controller/1.0\r\n'
    request += 'Content-Length: ' + payload.length + '\r\n'
    request += '\r\n'
    request += payload
    console.log("Build Request Command: " + cmd + ' ' + param)
    return request
}

HarmanKardonAVRAccessory.prototype.identify = function (callback) {
    this.log('Identify requested!')
    callback()
}

HarmanKardonAVRAccessory.prototype.getServices = function () {
    return this.enabledServices
}