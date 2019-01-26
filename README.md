# homebridge-harman-kardon-avr
This is a plugin for the DS18B20 temperature sensors.

Installation
--------------------
    sudo npm install -g https://github.com/marcelkordek/homebridge-harman-kardon-avr

Sample HomeBridge Configuration
--------------------
    {
    "bridge": {
        "name": "Homebridge",
        "username": "CC:22:3D:E3:CE:30",
        "port": 51826,
        "pin": "123-45-678"
    },

    "description": "",

    "accessories": [
        {
            "accessory": "Harman Kardon AVR",
            "name": "AVR",
            "description": "Harman Kardon AVR",
            "manufacturer": "Harman Kardon",
            "model_name": "AVR 161",
            "ip": "xx.x.x.xx",
            "port": "10025"
        }
    ]
}
