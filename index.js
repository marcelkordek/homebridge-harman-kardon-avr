'use strict'

var Service, Characteristic, UUIDGen
var net = require('net')
var pkg = require('./package.json')
var tcpp = require('tcp-ping')
var Poller = require('./lib/poller')

module.exports = function (homebridge) {
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  UUIDGen = homebridge.hap.uuid

  homebridge.registerAccessory('homebridge-harman-kardon-avr', 'harman-kardon-avr', HarmanKardonAVRAccessory)
}

function HarmanKardonAVRAccessory(log, config) {
  process.on('warning', e => log.warn(e.stack))

  // Config
  this.log = log
  this.name = config.name
  this.ip = config.ip
  this.port = config.port || 10025
  this.model_name = config.model_name || 'AVR 161'
  this.manufacturer = config.manufacturer || 'Harman Kardon'
  this.inputs = config.inputs
  this.interval = parseInt(config.interval, 10) || 5

  // Vars
  var that = this
  var powerOn = false
  this.enabledServices = []
  this.uuid = UUIDGen.generate(this.name)

  // Socket Connection
  this.client = new net.Socket()
  this.client.setNoDelay(true)
  this.client.setKeepAlive(true, 10000)

  // Information Service
  this.informationService = new Service.AccessoryInformation()
  this.informationService
    .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
    .setCharacteristic(Characteristic.Model, this.model_name)
    .setCharacteristic(Characteristic.SerialNumber, this.uuid)
    .setCharacteristic(Characteristic.FirmwareRevision, pkg.version)

  this.enabledServices.push(this.informationService)

  // Television Service
  // Add the actual TV Service and listen for change events from iOS.
  // We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
  this.televisionService = new Service.Television(this.name, this.uuid)
  this.televisionService.setCharacteristic(Characteristic.ConfiguredName, this.name)

  this.televisionService.setCharacteristic(Characteristic.SleepDiscoveryMode, Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE)

  this.televisionService
    .getCharacteristic(Characteristic.Active)
    .on('set', function (newValue, callback, context) {
      if (context === 'update') {
        if (newValue !== powerOn) {
          that.log('update Active => setNewValue: ' + newValue)
          callback(null, newValue)
        }
        return
      }

      that.log('set Active => setNewValue: ' + newValue)
      var power = newValue ? 'power-on' : 'power-off'

      that.command(power)

      callback(null, newValue)
    })
    .on('get', function (callback) {
      that.log('get State => ' + powerOn)
      callback(null, powerOn)
    })

  this.televisionService
    .getCharacteristic(Characteristic.ActiveIdentifier)
    .on('set', function (newValue, callback) {
      that.log('set Active Identifier => setNewValue: ' + newValue)

      var input = that.inputs[newValue]

      that.command('source-selection', input)

      callback(null, newValue)
    })

  this.televisionService
    .getCharacteristic(Characteristic.RemoteKey)
    .on('set', function (newValue, callback) {
      that.log('set Remote Key => setNewValue: ' + newValue)
      // ok = 8
      // hoch = 4
      // links = 6
      // rechts = 7
      // runter = 5
      // play/pause = 11
      // zurück = 9
      // i = 15
      var key
      switch (newValue) {
        case 9:
          key = 'back'
          break
        case 15:
          key = 'options'
          break
        case 8:
          key = 'ok'
          break
        case 4:
          key = 'up'
          break
        case 5:
          key = 'down'
          break
        case 6:
          key = 'left'
          break
        case 7:
          key = 'right'
          break
        default:
      }
      if (key) {
        that.command(key)
      }

      callback(null, newValue)
    })

  this.televisionService
    .getCharacteristic(Characteristic.PowerModeSelection)
    .on('set', function (newValue, callback) {
      that.log('set PowerModeSelection => setNewValue: ' + newValue)
      callback(null)
    })

  this.enabledServices.push(this.televisionService)

  // Speaker Service
  this.speakerService = new Service.TelevisionSpeaker(this.name + '_Speaker_' + this.uuid)

  this.speakerService
    .setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
    .setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.ABSOLUTE)

  this.speakerService
    .getCharacteristic(Characteristic.VolumeSelector)
    .on('set', function (newValue, callback) {
      that.log('set VolumeSelector => setNewValue: ' + newValue)
      var volume = newValue ? 'volume-down' : 'volume-up'

      that.command(volume)

      callback(null, newValue)
    })

  this.speakerService
    .getCharacteristic(Characteristic.Mute)
    .on('get', function (newValue, callback) {
      that.log('get Mute => setNewValue: ' + newValue)
      callback(null, false)
    })
    .on('set', function (newValue, callback) {
      that.log('set Mute => setNewValue: ' + newValue)

      that.command('mute-toggle')

      callback(null, newValue)
    })

  this.televisionService.addLinkedService(this.speakerService)
  this.enabledServices.push(this.speakerService)

  // Input Service
  if (this.inputs && this.inputs.length !== 0) {
    for (var index in this.inputs) {
      index = index++
      that.log(index + ' -> ' + this.inputs[index])

      this.Identifier = index
      this.Name = this.inputs[index]
      this.InputSourceType = 'HDMI'
      this.InputDeviceType = 'Playback'
      this.CurrentVisibilityState = 'Shown'

      this.input = new Service.InputSource(this.Name, this.Name, that.uuid)
      this.input
        .setCharacteristic(Characteristic.Identifier, this.Identifier)
        .setCharacteristic(Characteristic.ConfiguredName, this.Name)
        .setCharacteristic(
          Characteristic.IsConfigured,
          Characteristic.IsConfigured.CONFIGURED
        )
        .setCharacteristic(
          Characteristic.InputSourceType,
          Characteristic.InputSourceType[this.InputSourceType]
        )
        .setCharacteristic(
          Characteristic.InputDeviceType,
          Characteristic.InputDeviceType[this.InputDeviceType]
        )
        .setCharacteristic(
          Characteristic.CurrentVisibilityState,
          Characteristic.CurrentVisibilityState[this.CurrentVisibilityState]
        )
        // .setCharacteristic(Characteristic.TargetVisibilityState, Characteristic.TargetVisibilityState[this.TargetVisibilityState])
        .on('set', function (newValue, callback) {
          that.log('set InputSource => setNewValue: ' + newValue)

          var input = this.inputs[index]

          that.command('source-selection', input)
        })
      this.televisionService.addLinkedService(this.input)
      this.enabledServices.push(this.input)
    }
  }

  // Poller
  const poller = new Poller(this.interval * 1000)

  // Wait till the timeout sent our event to the EventEmitter
  poller.onPoll(() => {
    // that.log('triggered');
    tcpp.probe(that.ip, 8080, function (err, available) {
      if (err) {
        that.log(err)
        return
      }
      // that.log('Available: ', available)
      powerOn = available
      that.televisionService
        .getCharacteristic(Characteristic.Active)
        .setValue(powerOn, undefined, 'update')
      poller.poll() // Go for the next poll
    })
  })
  // Initial start
  poller.poll()
}

// https://github.com/KarimGeiger/HKAPI
HarmanKardonAVRAccessory.prototype.buildRequest = function (cmd, param) {
  var request = ''
  var payload = '<?xml version="1.0" encoding="UTF-8"?> <harman> <avr> <common> <control> <name>' + cmd + '</name> <zone>Main Zone</zone> <para>' + param + '</para> </control> </common> </avr> </harman>'
  request += 'POST HK_APP HTTP/1.1\r\n'
  request += 'Host: :' + this.ip + '\r\n'
  request += 'User-Agent: Harman Kardon AVR Controller/1.0\r\n'
  request += 'Content-Length: ' + payload.length + '\r\n'
  request += '\r\n'
  request += payload

  cmd = cmd | ''
  param = param | ''
  this.log('Build Request Command: ' + cmd + ' ' + param)
  return request
}

HarmanKardonAVRAccessory.prototype.command = function (cmd, param) {
  var that = this

  that.log('Socket Writable: ' + this.client.writable)

  if (this.client.writable) {
    this.client.write(that.buildRequest(cmd, param))
  } else {
    this.client.connect(this.port, this.ip, function () {
      that.client.write(that.buildRequest(cmd, param))
      // that.client.destroy()
    })
  }
  this.client.on('data', function (data) {
    that.log('Client Data: ' + data.toString())
  })

  this.client.on('error', function (err) {
    that.log('Error setting State: ' + err.message)
    that.client.end()
    that.client.destroy()
  })
}

HarmanKardonAVRAccessory.prototype.identify = function (callback) {
  this.log('Identify requested!')
  callback()
}

HarmanKardonAVRAccessory.prototype.getServices = function () {
  return this.enabledServices
}