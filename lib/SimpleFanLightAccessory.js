const BaseAccessory = require('./BaseAccessory');
const debounce = require('debounce');

class SimpleFanLightAccessory extends BaseAccessory {
    static getCategory(Categories) {
        return Categories.FAN;
    }

    constructor(...props) {
        super(...props);
    }

    _registerPlatformAccessory() {
        const {Service} = this.hap;
        this.accessory.addService(Service.Fan, this.device.context.name);
        this.accessory.addService(Service.Lightbulb, this.device.context.name + " Light");
        super._registerPlatformAccessory();
    }

    _registerCharacteristics(dps) {
        const {Service, Characteristic} = this.hap;
        const serviceFan = this.accessory.getService(Service.Fan);
        const serviceLightbulb = this.accessory.getService(Service.Lightbulb);
        this._checkServiceName(serviceFan, this.device.context.name);
        this._checkServiceName(serviceLightbulb, this.device.context.name + " Light");
        this.dpFanOn = this._getCustomDP(this.device.context.dpFanOn) || '1';
        this.dpRotationSpeed = this._getCustomDP(this.device.context.dpRotationSpeed) || '3';
        this.dpLightOn = this._getCustomDP(this.device.context.dpLightOn) || '9';
        this.dpBrightness = this._getCustomDP(this.device.context.dpBrightness) || '10';
        this.useLight = this._coerceBoolean(this.device.context.useLight, true);
        this.useBrightness = this._coerceBoolean(this.device.context.useBrightness, false);
        this.maxSpeed = parseInt(this.device.context.maxSpeed) || 3;
        // This variable is here so that we can set the fans to turn onto speed one instead of 3 on start.
        this.fanDefaultSpeed = parseInt(this.device.context.fanDefaultSpeed) || 1;
        // This variable is here as a workaround to allow for the on/off function to work.
        this.fanCurrentSpeed = parseInt(dps[this.dpRotationSpeed]);
        // Add setting to use .toString() on return values or not.
        this.useStrings = this._coerceBoolean(this.device.context.useStrings, true);

        const characteristicFanOn = serviceFan.getCharacteristic(Characteristic.On)
            .updateValue(this._getFanOn(dps[this.dpFanOn]))
            .on('get', this.getState.bind(this, this.dpFanOn))
            .on('set', this.setFanOn.bind(this));

        const characteristicRotationSpeed = serviceFan.getCharacteristic(Characteristic.RotationSpeed)
            .setProps({
                minValue: 0,
                maxValue: this.maxSpeed,
                minStep: 1,
                unit: 'speed'
            })
            .updateValue(this.convertRotationSpeedFromTuyaToHomeKit(dps[this.dpRotationSpeed]))
            .on('get', this.getState.bind(this, this.dpRotationSpeed))
            .on('set', this.setSpeed.bind(this));

        let characteristicLightOn;
        let characteristicBrightness;
        if (this.useLight) {
            characteristicLightOn = serviceLightbulb.getCharacteristic(Characteristic.On)
                .updateValue(this._getLightOn(dps[this.dpLightOn]))
                .on('get', this.getState.bind(this, this.dpLightOn))
                .on('set', this.setLightOn.bind(this));

            if (this.useBrightness) {
                characteristicBrightness = serviceLightbulb.getCharacteristic(Characteristic.Brightness)
                    .setProps({
                        minValue: 0,
                        maxValue: 1000,
                        minStep: 100
                    })
                    .updateValue(this.convertBrightnessFromTuyaToHomeKit(dps[this.dpBrightness]))
                    .on('get', this.getBrightness.bind(this))
                    .on('set', this.setBrightness.bind(this));
            }
        }

        this.device.on('change', (changes, state) => {

            if (state.hasOwnProperty(this.dpFanOn) && characteristicFanOn.value !== state[this.dpFanOn])
                characteristicFanOn.updateValue(state[this.dpFanOn]);
            
            if (state[this.dpFanOn] === false)
                this.fanCurrentSpeed = 0;
            
            if (state.hasOwnProperty(this.dpRotationSpeed) && this.convertRotationSpeedFromHomeKitToTuya(characteristicRotationSpeed.value) !== state[this.dpRotationSpeed]) {
                characteristicRotationSpeed.updateValue(this.convertRotationSpeedFromTuyaToHomeKit(state[this.dpRotationSpeed]));
                this.fanCurrentSpeed = state[this.dpFanOn] === true ? parseInt(state[this.dpRotationSpeed]) : 0;
            }
            if (state.hasOwnProperty(this.dpLightOn) && characteristicLightOn && characteristicLightOn.value !== state[this.dpLightOn])
                characteristicLightOn.updateValue(state[this.dpLightOn]);

            if (state.hasOwnProperty(this.dpBrightness) && characteristicBrightness && characteristicBrightness.value !== state[this.dpBrightness])
                characteristicBrightness.updateValue(state[this.dpBrightness]);

            this.log.debug('SimpleFanLight changed: ' + JSON.stringify(state));
        });
    }

    /*************************** FAN ***************************/
    // Get the Current Fan State
    getFanOn(callback) {
        this.getState(this.dpFanOn, (err, dp) => {
            if (err) return callback(err);
            callback(null, this._getFanOn(dp));
        });
    }

    _getFanOn(dp) {
        const {Characteristic} = this.hap;
        return dp;
    }

    setFanOn(value, callback) {
        this.log.info('Simplefanlight setFanOn ->', value);
        const {Characteristic} = this.hap;

        // This uses the multistatelegacy set command to send the fan on and speed request in one call.
        if (value === false ) {
          // This will turn off the fan speed if it is set to be 0.
          //return this.setState(this.dpFanOn, false, callback);
        } else {
          if (this.fanCurrentSpeed === 0) {
            // The current fanDefaultSpeed Variable is there to have the fan set to a sensible default if turned on.
            if (this.useStrings) {
                this.setState(this.dpRotationSpeed, this.fanDefaultSpeed.toString());
            } else {
                this.setState(this.dpRotationSpeed, this.fanDefaultSpeed);
            }
          //} else {
          //  // The current fanCurrentSpeed Variable is there to ensure the fan speed doesn't change if the fan is already on.
          //  if (this.useStrings) {
          //      return this.setMultiState({[this.dpRotationSpeed]: this.fanCurrentSpeed.toString(), [this.dpFanOn]: value}, callback);
          //  } else {
          //      return this.setMultiState({[this.dpRotationSpeed]: this.fanCurrentSpeed, [this.dpFanOn]: value}, callback);
          //  }
          }
        }
        return this.setState(this.dpFanOn, value, callback);
    }

    // Get the Current Fan Speed
    getSpeed(callback) {
        this.getState(this.dpRotationSpeed, (err, dp) => {
            if (err) return callback(err);
            callback(null, this.convertRotationSpeedFromTuyaToHomeKit(this.device.state[this.dpRotationSpeed]));
        });
    }

    // Set the new fan speed
    setSpeed(value, callback) {
      this.log.info('Simplefanlight setFanSpeed ->', value);
      const {Characteristic} = this.hap;
      if (value === 0) {
        //this.setFanOn(false, callback);
        // This is to set the fan speed variable to be 1 when the fan is off.
        if (this.useStrings) {
            //this.setState(this.dpRotationSpeed, this.fanDefaultSpeed.toString());
            this.device.state[this.dpRotationSpeed] = '0';
        } else {
            //this.setState(this.dpRotationSpeed, this.fanDefaultSpeed);
            this.device.state[this.dpRotationSpeed] = 0;

        }
        return callback();
      } else {
        // This is to set the fan speed variable to match the current speed.
        // This uses the multistatelegacy set command to send the fan on and speed request in one call.
        if (this.useStrings) {
            this.setState(this.dpRotationSpeed, this.convertRotationSpeedFromHomeKitToTuya(value).toString());
        } else {
            this.setState(this.dpRotationSpeed, this.convertRotationSpeedFromHomeKitToTuya(value));            
        }
        return this.setState(this.dpFanOn, true, callback);
      }
      callback();
    }

    /*************************** LIGHT ***************************/
    //Lightbulb State
    getLightOn(callback) {
        this.getState(this.dpLightOn, (err, dp) => {
            if (err) return callback(err);
            callback(null, this._getLightOn(dp));
        });
    }

    _getLightOn(dp) {
        const {Characteristic} = this.hap;
        return dp;
    }

    setLightOn(value, callback) {
        const {Characteristic} = this.hap;
        return this.setState(this.dpLightOn, value, callback);
        callback();
    }

    //Lightbulb Brightness
    getBrightness(callback) {
        this.getState(this.dpBrightness, (err, dp) => {
            if (err) return callback(err);
            callback(null, this._getBrightness(dp));
        });
    }

    _getBrightness(dp) {
        const {Characteristic} = this.hap;
        return dp;
    }

    setBrightness(value, callback) {
        const {Characteristic} = this.hap;
        return this.setState(this.dpBrightness, value, callback);
        callback();
    }
}

module.exports = SimpleFanLightAccessory;
