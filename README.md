# Homebridge Harman Kardon AVR

[![npm](https://img.shields.io/npm/v/homebridge-harman-kardon-avr?style=flat-square)](https://www.npmjs.com/package/npnhomebridge-harman-kardon-avr) [![npm bundle size](https://img.shields.io/bundlephobia/min/homebridge-harman-kardon-avr?style=flat-square)](https://github.com/marcelkordek/homebridge-harman-kardon-avr)
[![GitHub last commit](https://img.shields.io/github/last-commit/marcelkordek/homebridge-harman-kardon-avr?style=flat-square)](https://github.com/marcelkordek/homebridge-harman-kardon-avr)

This is a plugin for [Homebridge](https://github.com/nfarina/homebridge) to control your **Harman Kardon AVR.** 

This plugin supports following functions:

- **Power Switch** (on/off)
- **Volume control** (volume up/volume down/mute)
- **Inputs** like STB, Cable/Sat, Game, Radio, Spotify etc.
- **Remote control:** native iOS Remote control

## Installation instructions
After [Homebridge](https://github.com/nfarina/homebridge) has been installed:

```
$ sudo npm install -g homebridge-harman-kardon-avr
```

## Basic configuration

 ```
{
	"bridge": {
		...
	},

	"accessories": [{
		"accessory": "harman-kardon-avr",
		"name": "AVR",
		"manufacturer": "Harman Kardon",
		"model_name": "AVR 161",
		"ip": "xx.x.x.xx",
		"port": "10025",
        "inputs": ["STB","Cable/Sat"],
        "interval": 5
	}]
}

 ```
 See [Example Config](https://github.com/marcelkordek/homebridge-harman-kardon-avr/blob/master/config-sample.json) for more details.


## Options

| **Attributes** | **Required** | **Usage** |
|------------|----------|-------|
| accessory | **Yes** | **Must be** harman-kardon-avr.   |
| name | **Yes** | **Unique Name** for the TV (AVR) Accessory.   |
| manufacturer | **No** | Manufacturer (optional - Default: Harman Kardon)   |
| model_name | **No** | Model (optional - Default: AVR 161)   |
| ip | **Yes** | IP adress from your AVR |
| port | **Yes** | **Must be** 10025 |
| inputs | **Yes** | An Array of Inputs (STB/CABLE/SAT/GAME etc.) |
| interval | **Yes** | Polling interval in seconds _(Default: 5s)_ |