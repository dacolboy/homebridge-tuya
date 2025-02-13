const BaseAccessory = require('./BaseAccessory');
const http = require('node:http');
const crypto = require('node:crypto');
const { clearInterval } = require('node:timers');
const PQueue = require('@common.js/p-queue');


class MerossAccessory extends BaseAccessory {

    constructor(...props) {
        super(...props);

        this.waitingMessages = {}

        // Create the queue used for sending device requests
        this.updateInProgress = false
        this.queue = new PQueue.default({
            concurrency: 1,
            interval: 250,
            intervalCap: 1,
            timeout: 10000,
            throwOnTimeout: true,
        })
        this.queue.on('idle', () => {
            this.updateInProgress = false
        })

        // Always request a device update on startup, then start the interval for polling
        setTimeout(() => this.requestUpdate(true), 1000)
        this.refreshInterval = setInterval(
            () => this.requestUpdate(),
            (this.device.context.pollInterval || 10) * 1000
        );

        this.device.disconnect = () => {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.log.info('Parando el polling de %s', this.device.context.name);
            }
        }
    }

    async requestUpdate(firstRun = false) {
        // Don't continue if an update is currently being sent to the device
        if (this.updateInProgress) {
            return
        }
        try {
            // Add the request to the queue so updates are sent apart
            await this.queue.add(() => {
                // This flag stops the plugin from requesting updates while pending on others
                this.updateInProgress = true

                // Send the request
                this.waitingMessages[this._APIsend({
                    namespace: 'Appliance.System.All',
                    payload: {},
                })] = this.applyUpdate.bind(this);
            });
        } catch (err) {
            this.log.error(err.message || err);
        }
    }

    async APISendControl(dp, value, toSend, callback) {
        try {
            // Add the request to the queue so updates are sent apart
            await this.queue.add(() => {
                // Don't continue if the state is the same as before
                if (value === this.device.state[dp]) {
                    return
                }
                // This flag stops the plugin from requesting updates while pending on others
                this.updateInProgress = true

                this.waitingMessages[this._APIsend(toSend)] = { [dp]: value }
                callback();
            });
        } catch (err) {
            this.log.error(err.message || err);
            callback(err.message || err);
        }

    }

    _APIsend(toSend) {
        // Variable res is the response from either the cloud mqtt update or local http request
        let res

        // Generate the method variable determined from an empty payload or not
        toSend.method = toSend.method || (Object.keys(toSend.payload).length === 0 ? 'GET' : 'SET')

        // Check we have the user key
        if (!this.device.context.merossUserkey) {
            throw new Error('No user key')
        }

        // Check we have the serial number
        if (!this.device.context.serialNumber) {
            throw new Error('No serial number')
        }

        // Check the IP address exists
        if (!this.device.context.ipAddress) {
            throw new Error('No IP address')
        }

        const timestamp = Math.floor(Date.now() / 1000)
        const messageId = this._generateRandomString(32)
        const sign = crypto.createHash('md5')
            .update(messageId + this.device.context.merossUserkey + timestamp)
            .digest('hex');

        // Generate the payload to send
        const postData = JSON.stringify({
            header: {
                from: `http://${this.device.context.ipAddress}/config`,
                messageId,
                method: toSend.method,
                namespace: toSend.namespace,
                payloadVersion: 1,
                sign,
                timestamp,
                triggerSrc: 'iOSLocal',
                uuid: this.device.context.serialNumber,
            },
            payload: toSend.payload || {},
        });

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
            timeout: 5000,
            insecureHTTPParser: false
        };

        const req = http.request(`http://${this.device.context.ipAddress}/config`, options, (res) => {
            res.setEncoding('utf8');
            const buff = []
            res.on('data', (chunk) => {
                buff.push(chunk);
            });
            res.on('end', () => {
                //this.log.info('devuelve: %s', buff.join());
                const res = JSON.parse(buff.join());
                this.processApiResponse(res);
            });
        });

        req.on('error', (e) => {
            this.log.error(`problem with request: ${e.message}`);
            this.device.connected = false;
        });

        req.on('timeout', () => {
            this.log.error('API timeout');
            req.destroy();
        });

        // Write data to request body
        req.write(postData);
        req.end();
        return messageId;
    }

    processApiResponse(res) {
        // Check the response properties based on whether it is a control or request update
        if (!this.device.connected) {
            this.device.emit('change', this.device.state, this.device.state);
            this.device.connected = true;
        }

        if (!res || !res.header || res.header.method === 'ERROR') {
            return this.log.error(`API Error: ${JSON.stringify(res.payload.error)}`);
        }

        const messageId = res.header.messageId;
        if (!messageId) {
            return this.log.error('API messageId Error: %s', messageId);
        }
        const resHandler = this.waitingMessages[messageId];
        if (res.header.method == 'GETACK') { // GET            
            // Validate the response, checking for payload property
            if (!res.payload) {
                return this.log.error('Respuesta GETACK sin payload: ' + JSON.stringify(res));
            }

            // Check we are sending the command to the correct device
            if (
                res.header.from
                !== `/appliance/${this.device.context.serialNumber}/publish`
            ) {
                return this.log.error('Wrong Device');
            }

            if (typeof resHandler == 'function')
                resHandler(res.payload);
        }
        else if (res.header.method == 'SETACK') { // SETACK
            if (typeof resHandler == 'object') {
                this.log.info('setack received from %s with change: %s', this.device.context.name, JSON.stringify(resHandler));
                this.device.state = { ...this.device.state, ...resHandler }
                this.device.emit('change', resHandler, this.device.state);
            }
        }
    }

    _generateRandomString(length) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
        let nonce = ''
        while (nonce.length < length) {
            nonce += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return nonce
    }
}

module.exports = MerossAccessory;