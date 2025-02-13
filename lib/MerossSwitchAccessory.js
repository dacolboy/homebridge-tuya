const MerossAccessory = require('./MerossAccessory');
const http = require('node:http');
const crypto = require('node:crypto');

class MerossSwitchAccessory extends MerossAccessory {
    static getCategory(Categories) {
        return Categories.SWITCH;
    }

    constructor(...props) {
        super(...props);
    }

    _registerPlatformAccessory() {
        this._verifyCachedPlatformAccessory();
        this._justRegistered = true;

        super._registerPlatformAccessory();
    }

    _verifyCachedPlatformAccessory() {
        if (this._justRegistered) return;

        const { Service } = this.hap;

        const switchCount = parseInt(this.device.context.switchCount) || 1;
        const _validServices = [];
        for (let i = 0; i++ < switchCount;) {
            let service = this.accessory.getServiceByUUIDAndSubType(Service.Switch, 'switch ' + i);
            if (service) this._checkServiceName(service, this.device.context.name + ' ' + i);
            else service = this.accessory.addService(Service.Switch, this.device.context.name + ' ' + i, 'switch ' + i);

            _validServices.push(service);
        }

        this.accessory.services
            .filter(service => service.UUID === Service.Switch.UUID && !_validServices.includes(service))
            .forEach(service => {
                this.log.info('Removing', service.displayName);
                this.accessory.removeService(service);
            });
    }

    _registerCharacteristics(dps) {
        this._verifyCachedPlatformAccessory();

        const { Service, Characteristic } = this.hap;

        const characteristics = {};
        this.accessory.services.forEach(service => {
            if (service.UUID !== Service.Switch.UUID || !service.subtype) return false;

            let match;
            if ((match = service.subtype.match(/^switch (\d+)$/)) === null) return;
            characteristics[match[1]] = service.getCharacteristic(Characteristic.On)
                .updateValue(dps[match[1]])
                .on('get', this.getState.bind(this, match[1]))
                .on('set', this.setState.bind(this, match[1]));
        });

        this.device.on('change', (changes, state) => {
            Object.keys(changes).forEach(key => {
                if (characteristics[key] && characteristics[key].value !== changes[key]) characteristics[key].updateValue(changes[key]);
            });
        });
    }

    setState(dp, value, callback) {
        this.log.info('%s set state %s', this.device.context.name, JSON.stringify({ [dp]: value }));
        // The plugin should have determined if it's 'toggle' or 'togglex' on the first poll run
        let namespace
        let payload
        if (this.isToggleX) {
            namespace = 'Appliance.Control.ToggleX'
            payload = {
                togglex: {
                    onoff: value ? 1 : 0,
                    channel: 0,
                },
            }
        } else {
            namespace = 'Appliance.Control.Toggle'
            payload = {
                toggle: {
                    onoff: value ? 1 : 0,
                },
            }
        }

        // Use the platform function to send the update to the device
        this.APISendControl(dp, value, {
            namespace,
            payload,
        }, callback);
    }

    applyUpdate(data) {
        if (data.all.digest) {
            let _data;
            if (data.all.digest.togglex && data.all.digest.togglex[0]) {
                this.isToggleX = true
                _data = data.all.digest.togglex[0];
            } else if (data.all.digest.toggle) {
                this.isToggleX = false
                _data = data.all.digest.toggle;
            }
            // Check the data is in a format which contains the value we need
            if (_data.hasOwnProperty('onoff')) {
                // newState is given as 0 or 1 -> convert to bool for HomeKit
                const newState = _data.onoff === 1

                // Check against the cache and update HomeKit and the cache if needed
                if (this.device.state["1"] !== newState) {
                    this.log(`${this.device.context.name} changed to: [${newState ? 'on' : 'off'}]`)
                    this.device.state["1"] = newState
                    this.device.emit('change', { ["1"]: newState }, this.device.state);
                }
            } else {
                this.log.warn('%s devuelve algo raro: %s', this.device.context.name, JSON.stringify(_data));
            }
        }
    }
}

module.exports = MerossSwitchAccessory;
