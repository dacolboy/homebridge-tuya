const BaseAccessory = require('./BaseAccessory');

const RFCOMMAND = {
    "rf_type": "sub_2g",
    "mode": 0,
    "key1": {
        "times": 6,
        "intervals": 0,
        "delay": 0,
        "code": "--"
    },
    "feq": 0,
    "rate": 0,
    "control": "rfstudy_send",
    "ver": "2"
};

class RFRemoteAccessory extends BaseAccessory {
    static getCategory(Categories) {
        return Categories.BRIDGE;
    }

    constructor(...props) {
        super(...props);
    }

    _registerPlatformAccessory() {
        // no registro ne
    }

    _registerCharacteristics(dps) {
        this.dpRFCommand = this._getCustomDP(this.device.context.dpRFCommand) || '201';
        this.repeatRFTx = this._coerceBoolean(this.device.context.repeatRFTx, false);
    }

    sendRFCommand(codes, callback) {
        if (!this.device.connected) return callback && callback(new this.hap.HapStatusError(this.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        if (typeof codes == 'string')
            codes = [codes];
        const RFCommand = RFCOMMAND;
        let ret = true;
        for (let i=0; i < codes.length && ret; i++) {
            RFCommand.key1.code = codes[i];
            ret = this.device.update({[this.dpRFCommand.toString()] : JSON.stringify(RFCommand)});
            if (this.repeatRFTx && ret) 
                ret = this.device.update({[this.dpRFCommand.toString()] : JSON.stringify(RFCommand)});
        }
        callback && callback(!ret);
    }
}

module.exports = RFRemoteAccessory;