const BaseAccessory = require('./BaseAccessory');
const async = require('async');
const { access } = require('fs-extra');
const raw = require('raw-socket');

const buffer = Buffer.from([
    0x08, 0x00, 0x00, 0x00, 0x00, 0x01, 0x0a, 0x09,
    0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68,
    0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70,
    0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x61,
    0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69]);

raw.writeChecksum (buffer, 2, raw.createChecksum (buffer));

class SwitchAccessory extends BaseAccessory {
    static getCategory(Categories) {
        return Categories.SWITCH;
    }

    constructor(...props) {
        super(...props);
        this._socket = raw.createSocket({protocol: raw.Protocol.ICMP});
    }

    _registerPlatformAccessory() {
        this._verifyCachedPlatformAccessory();
        this._justRegistered = true;

        super._registerPlatformAccessory();
    }

    _verifyCachedPlatformAccessory() {
        if (this._justRegistered) return;

        const {Service} = this.hap;

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

        const {Service, Characteristic} = this.hap;

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

    _connectDependantDevices() {
        this._getDependantAccessories().forEach(async (acc) => {
            this.log.info('Conectando %s: %s', acc.device.context.name, acc.device.context.ip);
            //try {
            //    await this.pingDevice(acc.device.context.ip);
            setTimeout(() => acc.device.connect(), 3000);
            //} catch(e) {
            //    this.log.error(e);
            //}            
        });
    }

    _disconnectDependatnDevices() {
        this._getDependantAccessories().forEach(async (acc) => {
            this.log.info('Desconectando %s: %s', acc.device.context.name, acc.device.context.ip);
            acc.powerSourceOff();
        });
    }

    pingDevice(ip) {
        return new Promise((resolve, reject) => {
            let pingTimeout, maxRetries = 20;
            this._socket.on ("message", (buffer, source) => {
                console.log ("received " + buffer.length + " bytes from " + source);
                clearTimeout(pingTimeout);
                this._socket.close();
                resolve();
            });
            const ping = () => {
                this.log.info('enviando a %s', ip);
                this._socket.send (buffer, 0, buffer.length, ip, (error, bytes) => {
                    if (error) {
                        console.log (error.toString ());
                    } else {
                        console.log ("sent " + bytes + " bytes to " + ip);
                    }
                    if (--maxRetries > 0)
                        pingTimeout = setTimeout(() => ping(), 1000);
                    else {
                        this._socket.close();
                        reject('Device not responding');
                    }
            });
            }
            setTimeout(() => ping(), 3000);
        });
    }

    getPower(dp, callback) {
        callback(null, this.device.state[dp]);
    }

    setPower(dp, value, callback) {
        if (!this._pendingPower) {
            this._pendingPower = {props: {}, callbacks: []};
        }

        if (dp) {
            if (this._pendingPower.timer) clearTimeout(this._pendingPower.timer);

            this._pendingPower.props = {...this._pendingPower.props, ...{[dp]: value}};
            this._pendingPower.callbacks.push(callback);

            this._pendingPower.timer = setTimeout(() => {
                this.setPower();
            }, 500);
            return;
        }

        const callbacks = this._pendingPower.callbacks;
        const callEachBack = err => {
            async.eachSeries(callbacks, (callback, next) => {
                try {
                    callback(err);
                } catch (ex) {}
                next();
            });
        };

        const newValue = this._pendingPower.props;
        this._pendingPower = null;

        this.setMultiState(newValue, callEachBack);
    }

    _getDependantAccessories() {
        let accessories = [];
        for (let [key, acc] of this.platform.cachedAccessories) {
            if (acc.device && acc.device.context.powerDevice.id == this.device.context.id)
                accessories.push(acc);
        }
        return accessories;
    }
}

module.exports = SwitchAccessory;
