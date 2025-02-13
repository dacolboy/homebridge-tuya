const SimpleFanLightAccessory = require('./SimpleFanLightAccessory');
const RFRemoteAccessory = require('./RFRemoteAccessory');
const { access } = require('fs-extra');

const isNonEmptyPlainObject = o => {
    if (!o) return false;
    for (let i in o) return true;
    return false;
};

const RFcommands = {
    fan1: "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuMzMiLCJkYXRhMCI6IlpoOG1BZUlDNGdMNUFPSUMrUURpQXZrQStRRGlBdmtBNGdMaUFpWUI0Z0w1QU9JQytRRGlBaVlCMWdEaUF1SUMrUUQ1QU9JQzRnTFdBT0lDK1FENUFPSUMrUURpQXZrQTRnTFdBT0lDK1FEaUF2a0E0Z0w1QU9JQzRnTDVBUGtBNGdMNUFPSUMrUURpQXRZQTRnTGlBaVlCK1FEaUF1SUMrUURpQXZrQStRRGlBdmtBIiwibHYiOlswXX0=",
    fan2: "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuMzMiLCJkYXRhMCI6IjB4OEZBZW9DNmdJRkFlb0NCUUhxQWdVQkJRSHFBZ1VCNmdMcUF0Z0E2Z0lGQWVvQ0JRSHFBdGdBQlFIcUF1b0NCUUhZQU9vQzZnSUZBZW9DQlFFRkFlb0NCUUhxQWdVQjZnSUZBZW9DQlFIcUFnVUI2Z0lGQWVvQzZnSUZBZW9DQlFFRkFlb0NCUUhxQXVvQzJBRHFBZ1VCQlFIcUF1b0MyQUFGQWVvQzZnSUZBZGdBIiwibHYiOlswXX0=",
    fan2a: "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuNDAiLCJkYXRhMCI6IkloOERBZWtDNlFJREFla0NBd0hwQWdNQkF3SHBBZ01CNlFMcEF0Y0E2UUxYQU9rQ0F3SHBBZ01CQXdIcEF1a0NBd0VEQWVrQzZRTFhBT2tDMXdBREFla0NBd0hwQWdNQjZRSURBZWtDQXdIcEFnTUI2UUlEQWVrQzZRTFhBT2tDQXdIWEFPa0M2UUlEQWVrQ0F3SHBBZ01CQXdIcEFnTUI2UUlEQWVrQzZRSURBZGNBIiwibHYiOlswXX0=",
    fan3: "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuMzMiLCJkYXRhMCI6IlV4OURBZWtDNlFJRUFla0MyQURwQWdRQkJBSHBBdGdBNlFMcEFnUUI2UUlFQWVrQzJBRHBBZ1FCQkFIcEF1a0NCQUVFQWVrQzZRSUVBZWtDMkFBRUFla0NCQUhwQWdRQjZRSUVBZWtDQkFIcEF1a0MyQUFFQWVrQ0JBSHBBdWtDMkFBRUFla0M2UUlFQWRnQTZRTHBBZ1FCNlFJRUFRUUI2UUlFQWVrQzZRSUVBZGdBIiwibHYiOlswXX0=",
    fanOff: "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuMzMiLCJkYXRhMCI6IkV4LzRBQUVEQVFQWEFBRURKUUVCQS9nQStBQ3BBdmdBQVFPcEF2Z0FBUVA0QUFFRCtBQUJBL2dBK0FDcEFnRURKUUhYQUFFREFRUDRBQUVEK0FENEFBRUQrQUFCQS9nQUFRUFhBQUVEK0FDcEFpVUJBUU1CQS9nQUFRUDRBUGdBQVFQNEFBRURBUVA0QUFFRCtBQUJBL2dBK0FBQkF3RUQrQURYQUFFREpRR3BBdmdBIiwibHYiOlswXX0=",
    lightOff: "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuMzMiLCJkYXRhMCI6IlZ4OGxBZGdDMkFMMEFOZ0M5QURZQXZRQUpRSFlBdlFBMkFMWUF2UUEyQUwwQU5nQzlBRFlBdlFBSlFIWUF0Z0M5QUQwQU5nQzJBTDBBTmdDOUFEMEFOZ0M5QURZQXZRQTJBSWxBZGdDOUFEWUF0Z0M5QUQwQU5nQzlBRFlBdlFBMkFMMEFOZ0MyQUwwQVBRQTJBTFlBdlFBMkFMMEFQUUEyQUwwQU5nQzlBRFlBaVVCIiwibHYiOlswXX0=",
    lightOffa: "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuMzgiLCJkYXRhMCI6Ik9oOGtBWjBDQ2dQNEFBb0Qwd0FLQXlRQjB3QUtBL2dBQ2dNS0EvZ0FDZ1A0QUFvRCtBQUtBL2dBK0FDZEFnb0QrQUQ0QUFvRENnUFRBQW9EK0FENEFBb0RKQUdkQXZnQUNnUDRBSjBDSkFHZEFnb0QrQURUQUFvRCtBQUtBL2dBQ2dQNEFBb0QrQUFLQXdvRCtBRDRBQW9EQ2dQNEFBb0QrQUFLQS9nQUNnUDRBUGdBIiwibHYiOlswXX0=",
    lightOn: "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuMzMiLCJkYXRhMCI6Ilp4OEVBZWdDNkFJRUFlZ0NCQUhvQWdRQkJBSG9BZ1FCNkFMb0F0a0E2QUxaQU9nQ0JBSG9BZ1FCQkFIb0F1Z0NCQUhaQU9nQzZBTFpBT2dDQkFIWkFPZ0NCQUhvQWdRQjZBSUVBZWdDQkFIb0F1Z0NCQUVFQWVnQ0JBSG9BdGtBNkFJRUFlZ0NCQUhvQWdRQjZBTG9BZ1FCNkFJRUFlZ0MyUUFFQWVnQ0JBSG9BZ1FCIiwibHYiOlswXX0="
}

const RFSwitchLightCodes = [
    "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuOTIiLCJkYXRhMCI6InlCOERBZXNDNndJREFlc0NBd0hyQXRrQUF3SHJBdGtBNndMckF0a0E2d0lEQWVzQ0F3SHJBZ01CQXdIckF1c0NBd0haQU9zQzZ3SURBZXNDQXdFREFlc0NBd0hyQWdNQjZ3TFpBT3NDQXdIckF1c0MyUUFEQWVzQ0F3SHJBZ01CNndJREFlc0NBd0hyQXVzQzJRRHJBZ01CNndJREFlc0MyUURyQWdNQkF3SHJBZ01CIiwibHYiOlswXX0=",
    "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuOTIiLCJkYXRhMCI6IjVoL1lBT2tDNlFMWUFPa0NCQUhwQXRnQUJBSHBBdGdBNlFMcEF0Z0E2UUlFQWVrQzJBRHBBZ1FCQkFIcEF1a0MyQUFFQWVrQzZRSUVBZWtDMkFBRUFla0NCQUhwQWdRQjZRSUVBZWtDMkFEcEF1a0NCQUVFQWVrQ0JBSHBBZ1FCNlFJRUFla0NCQUhwQWdRQjZRTFlBT2tDNlFMWUFPa0NCQUVFQWVrQzZRSUVBZGdBIiwibHYiOlswXX0=",
    "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuOTIiLCJkYXRhMCI6ImtCNERBZXdDN0FJREFld0MyUURzQWdNQkF3SHNBZ01CN0FMc0FnTUI3QUlEQWV3Q0F3SHNBZ01CQXdIc0F1d0MyUUFEQWV3QzdBSURBZXdDQXdFREFld0NBd0hzQWdNQjdBSURBZXdDQXdIc0F1d0NBd0VEQWV3Q0F3SHNBZ01CN0FJREFld0M3QUxaQU93Q0F3RURBZXdDN0FMWkFBTUI3QUxzQXRrQTdBSURBUU1CIiwibHYiOlswXX0=",
    "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuOTIiLCJkYXRhMCI6ImF4OERBZjBDL1FJREFmMENBd0g5QXRzQUF3SDlBZ01CL1FMOUFnTUIvUUlEQWYwQ0F3SDlBZ01CMndEOUF2MEMyd0FEQWYwQy9RTGJBUDBDQXdFREFmMENBd0g5QWdNQi9RTGJBUDBDQXdIOUF2MENBd0VEQWYwQ0F3SDlBZ01CL1FJREFmMEMvUUxiQUFNQi9RSURBZjBDL1FJREFRTUIvUUlEQWYwQy9RSURBZHNBIiwibHYiOlswXX0=",
    "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuOTIiLCJkYXRhMCI6IjRoNERBZXNDNndMWUFPc0NBd0hyQWdNQkF3SHJBZ01CNndMckF0Z0E2d0lEQWVzQ0F3SHJBdGdBQXdIckF1c0NBd0VEQWVzQzZ3SURBZXNDQXdFREFlc0NBd0hyQXRnQTZ3STlBZXNDQXdIckF1c0NBd0VEQWVzQ0F3SHJBZ01CNndJREFlc0NBd0hyQXVzQ0F3RURBZXNDNndJREFlc0NBd0hyQWdNQjZ3TFlBQU1CIiwibHYiOlswXX0=",
    "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuOTIiLCJkYXRhMCI6ImlpQURBZXdDN0FMYkFPd0Myd0RzQWdNQjJ3RHNBZ01CN0FMc0FnTUI3QUlEQWV3Q0F3SHNBZ01CMndEc0F1d0NBd0VEQWV3QzdBTGJBT3dDQXdIYkFPd0NBd0hzQWdNQjdBTGJBT3dDQXdIc0F1d0Myd0FEQWV3Q0F3SHNBdHNBN0FJREFld0M3QUlEQWV3QzJ3RHNBZ01CN0FJREFRTUI3QUxzQWdNQjJ3RHNBZ01CIiwibHYiOlswXX0=",
    "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuOTIiLCJkYXRhMCI6InZCOERBZXNDNndJREFlc0MyUURyQWtJQjJRRHJBZ01CNndMckFnTUI2d0lEQWVzQzJRRHJBZ01CMlFEckF1c0MyUUFEQWVzQzZ3SURBZXNDMlFBREFlc0NBd0hyQWdNQjZ3SURBZXNDQXdIckF1c0MyUUFEQWVzQ0F3SHJBZ01CNndJREFlc0M2d0lEQVFNQjZ3THJBZ01CNndJREFRTUI2d0lEQWVzQ0F3SHJBZ01CIiwibHYiOlswXX0=",
    "eyJudW0iOjEsInZlciI6IjIiLCJzdHVkeV9mZXEiOiI0MzMuOTIiLCJkYXRhMCI6IlhCOENBZW9DNmdJQ0Flb0NBZ0hxQWdJQkFnSHFBdGtBNmdMcUF0a0E2Z0lDQWVvQ0FnSHFBZ0lCQWdIcUF1b0MyUUFDQWVvQzZnSUNBZW9DQWdFQ0Flb0MyUURxQWdJQjZnSUNBZW9DMlFEcUF1b0MyUUFDQWVvQ0FnSHFBZ0lCNmdJQ0Flb0NBZ0hxQXVvQ0FnSHFBZ0lCNmdMWkFPb0NBZ0hxQWdJQkFnSHFBZ0lCIiwibHYiOlswXX0="
]

class RFFanLightAccessory extends SimpleFanLightAccessory {
    constructor(...props) {
        super(...props);
        //this.usePowerAccessory = Boolean(this.device.context.powerDevice);
        this.device.context.powerDevice && this._findPowerAccessory();
    }

    setLightOn(value, callback) {
        if (value === true) {
            process.nextTick(() => {
                this.device.emit('change', { [this.dpLightOn]: false }, { [this.dpLightOn]: false });
            });
            return callback(); // anulo porque siri lo enciende cuando digo "enciende la luz"
        }
        this.log.info('RF setLightOn ->', value);
        if (this.powerAccessory) {
            try {
                const power = this.getStateSync(this.dpPower);
                if (power === false) {
                    if (value === false)
                        return callback();
                    else
                        return this.setState(this.dpPower, true, callback);
                } else if (value === false) {
                    // el ventilaca está alimentado
                    const fanPower = this.getStateSync(this.dpFanOn);
                    if (fanPower === false) {// se puede cortar corriente para apagar la luz
                        return this.setState(this.dpPower, false, callback);
                    }
                }
            } catch (err) {
                this.log.error('Error setLightOn -> %s mediante powerDevice: %s\nIntentémoslo directamente.', value, err.message || err);
                //return callback(err);
            }
        }
        super.setLightOn(value, (err) => {
            if (err) {
                return this.setRFLightOn(value, callback);
            }
            callback && callback(err);
        });
    }

    setFanOn(value, callback) {
        this.log.info('RF setFanOn ->', value);
        if (this.powerAccessory) {
            try {
                const power = this.getStateSync(this.dpPower);
                if (power === false) {
                    if (value === false)
                        return callback();
                    else
                        return this.setStateSync(this.dpPower, true, err => {
                            if (err) return callback(err);
                            setTimeout(() => this.setRFLightOn(false, err => {
                                if (err) return callback(err);
                                return setTimeout(() => this.setRFFanOn(value, callback), 1000);
                            }), 500);
                        });
                } else if (value === false) {
                    // el ventilaca está alimentado
                    const lightOn = this.getStateSync(this.dpLightOn);
                    if (lightOn === false) {// se puede cortar corriente para apagar el ventilaca
                        return this.setState(this.dpPower, false, callback);
                    }
                }
            } catch (err) {
                this.log.error('Error setLightOn -> %s mediante powerDevice: %s\nIntentémoslo directamente.', value, err.message || err);
                //return callback(err);
            }
        }
        super.setFanOn(value, (err) => {
            if (err) {
                return this.setRFFanOn(value, callback);
            }
            callback && callback(err);
        });
    }

    setRFLightOn(value, callback) {
        this.log.info('setRFLightOnAsync ->', value);
        const command = value === false ? 'lightOff' : 'lightOn';
        this._sendRF(RFcommands[command], this.dpLightOn, value, callback);
    }

    setRFFanOn(value, callback) {
        this.log.info('setRFFanOn ->', value);
        const command = value === false ? 'fanOff' : 'fan1';
        this._sendRF(RFcommands[command], this.dpFanOn, value, callback);
    }

    _sendRF(code, dp, value, callback) {
        try {
            if (this.powerAccessory && this.getStateSync(this.dpPower) !== true) 
                throw new this.hap.HapStatusError(this.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

            const ra = this.RFAccessory || this._getRFRemoteAccessory();
            if (!ra) throw new Error('no detecto accesorio RF');
            this.log.info('usando %s', ra.device.context.name);
            ra.sendRFCommand(code, async err => {
                if (err) return callback(err);
                if (this.powerAccessory) {

                    this.device.state[dp] = value;
                    this.device.emit('change', { [dp]: value }, this.device.state);
                    return callback();
                } else {
                    await this.checkFor(this, dp, value);
                    callback();
                }
            });
        } catch (err) {
            this.log.error('%s: %s', this.device.context.name, err.message || err);
            callback(err);
        }
    }

    checkFor(accessory, dp, value) {
        return new Promise((resolve, reject) => {
            let checkTimeout;
            const check = (changes) => {
                if (changes.hasOwnProperty(dp)) {
                    clearTimeout(checkTimeout);
                    accessory.device.off('change', check);
                    if (changes[dp] === value) {
                        this.log.info('correcto');
                        resolve();
                    } else {
                        this.log.error('Valor recibido no coincide con esperado');
                        reject(new this.hap.HapStatusError(this.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
                    }
                }
            }
            accessory.device.on('change', check);
            checkTimeout = setTimeout(() => {
                accessory.device.off('change', check);
                this.log.error('The operation timed out');
                reject(new this.hap.HapStatusError(this.hap.HAPStatus.OPERATION_TIMED_OUT));
            }, 10000);
        })
    }

    _getRFRemoteAccessory() {
        for (let [key, value] of this.platform.cachedAccessories) {
            if (value instanceof RFRemoteAccessory) {
                this.log.info('%s usa %s para comandos RF', this.device.context.name, value.device.context.name);
                return this.RFAccessory = value;
            }
        }
    }

    _findPowerAccessory() {
        const checkPA = () => {
            for (let [key, value] of this.platform.cachedAccessories) {
                if (!value.device) continue;
                if (value.device.context.id == this.device.context.powerDevice.id)
                    return this._setupPowerAccessory(value);
            }
        }
        checkPA();
        if (!this.powerAccessory)
            setTimeout(checkPA, 10000);
    }

    _setupPowerAccessory(accessory) {
        this.log.info('%s usa %s como power link', this.device.context.name, accessory.device.context.name);
        this.powerAccessory = accessory;
        this.dpPower = this._getCustomDP(this.device.context.dpPowerOn) || '0';
        this.dpFanOn = this._getCustomDP(this.device.context.dpFanOn) || '1';
        this.dpRotationSpeed = this._getCustomDP(this.device.context.dpRotationSpeed) || '3';
        this.dpLightOn = this._getCustomDP(this.device.context.dpLightOn) || '9';
        this.fanDefaultSpeed = parseInt(this.device.context.fanDefaultSpeed) || 1;
        const powerDeviceDP = this.device.context.powerDevice.dp;

        this.device.once('change', () => {
            if (!this.device.state.hasOwnProperty(this.dpPower))
                this.device.state[this.dpPower] = true;
            else if (this.device.state[this.dpPower] === false)
                // por si acaso el primer change recibido no viene del power accessory, si no de la inicialización manual
                this.device.disconnect();
        });

        accessory.device.on('change', (changes, state) => {
            const o = changes || value.device.state;
            if (o.hasOwnProperty(powerDeviceDP) &&
                (!this.device.state.hasOwnProperty(this.dpPower) || o[powerDeviceDP] != this.device.state[this.dpPower])) {

                const newPowerValue = Boolean(o[powerDeviceDP]);
                if (newPowerValue === false) {
                    if (this._connectTimeout) {
                        clearTimeout(this._connectTimeout);
                        this._connectTimeout = null;
                    }
                    this.device.disconnect();
                } else {
                    this._connectTimeout = setTimeout(() => {
                        if (!this.device.connected)
                            this.device.connect();
                        this._connectTimeout = null;
                    }, 5000);
                }

                const newState = {
                    [this.dpPower]: newPowerValue,
                    [this.dpLightOn]: newPowerValue,
                    [this.dpFanOn]: false,
                    [this.dpRotationSpeed]: this.fanDefaultSpeed.toString()
                }
                const _changes = {};
                Object.keys(newState).forEach(key => {
                    if (newState[key] !== this.device.state[key]) {
                        _changes[key] = newState[key];
                    }
                });
                this.device.state = { ...this.device.state, ..._changes }
                this.device.emit('change', _changes, this.device.state);
            }
        });

        if (!accessory.device.connected) {
            accessory.device.once('connect', () => this.device.emit('connect'));
        } else {
            this.device.emit('connect');
            if (accessory.device.state.hasOwnProperty(powerDeviceDP)) {
                // el accesorio ya ha recibido el primer change, por lo que hay que inicializar el tema
                const powerValue = accessory.device.state[powerDeviceDP];

                const initState = {
                    [this.dpPower]: powerValue,
                    [this.dpLightOn]: powerValue,
                    [this.dpFanOn]: false,
                    [this.dpRotationSpeed]: this.fanDefaultSpeed.toString()
                }
                this.device.state = { ...initState, ...this.device.state }
                // disparo un change para que quede ready to handle si no ha recibido ninguno aún y se desconecte si no está alimentado.
                this.device.emit('change', this.device.state, this.device.state);
            }
        }
    }

    _isOperable() {
        return this.powerAccessory ? this.powerAccessory.device.connected : this.device.connected;
    }

    getState(dp, callback) {
        if (!this._isOperable()) return callback(new this.hap.HapStatusError(this.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        const _callback = () => {
            if (Array.isArray(dp)) {
                const ret = {};
                dp.forEach(p => {
                    ret[p] = this.device.state[p];
                });
                callback(null, ret);
            } else {
                callback(null, this.device.state[dp]);
            }
        };

        process.nextTick(_callback);
    }

    setState(dp, value, callback) {
        if (!this._isOperable()) return callback && callback(new this.hap.HapStatusError(this.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        if (dp == this.dpPower)
            return this.powerAccessory.setState(this.device.context.powerDevice.dp, value, callback);
        else
            super.setState(dp, value, callback);
    }

    setStateSync(dp, value, callback) {
        return this.setState(dp, value, err => {
            if (err) return callback(err);
            this.device.once('change', changes =>
                callback(!(changes.hasOwnProperty(dp) && changes[dp] === value))
            );
        });
    }

    setMultiState(dps, callback) {
        if (!this._isOperable()) return callback && callback(new this.hap.HapStatusError(this.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        for (const dp in dps) {
            if (dps.hasOwnProperty(dp) && dps[dp] !== this.device.state[dp]) {
                this.__ret = this.device.update({ [dp.toString()]: dps[dp] });
            }
        }
        callback && callback(!this.__ret);
    }

    getStateSync(dp) {
        if (!this._isOperable()) 
            throw new this.hap.HapStatusError(this.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

        if (Array.isArray(dp)) {
            const ret = {};
            dp.forEach(p => {
                ret[p] = this.device.state[p];
            });
            return ret;
        } else {
            return this.device.state[dp];
        }
    }
}

module.exports = RFFanLightAccessory;