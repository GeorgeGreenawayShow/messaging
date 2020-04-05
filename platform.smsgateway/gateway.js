const axios = require("axios").default

exports.GatewayCallbacks = class {
    constructor(mqtt) {
        this.mqtt = mqtt;
    }

    async new_message(data) {
        // Called whenever a new message is sent in.
        if (data.event != 'MESSAGE_RECEIVED') {
            // Sanity check for event
            console.dir(data)
            console.warn("Ignored the above message, expected 'MESSAGE_RECEIVED' event.")
            return;
        }

        this.mqtt.send_message(data.message, data['phone_number'], {})
    }

    async message_send(data, cache) {
        // Called whenever a message is sent from gateway
        if (data.event != 'MESSAGE_SENT') {
            // Sanity check for valid event
            console.dir(data)
            console.warn("Invalid event type, expecting 'MESSAGE_SENT'")
            return;
        }

        if (cache[data.id] == undefined) {
            console.warn(`Attempt to reply to ${data.id} falied, doesn't exist in cache.`)
            return;
        }

        await this.mqtt.reply_status_update(cache[data.id], 'sent')

    }

    async message_failed(data, cache) {
        // Called when an SMS fails to send
        if (data.event != 'MESSAGE_FAILED') {
            // Sanity check for valid event
            console.dir(data)
            console.warn("Invalid event type, expecting 'MESSAGE_FAILED'")
            return;
        }

        if (cache[data.id] == undefined) {
            console.warn(`Attempt to send fail to ${data.id} falied, doesn't exist in cache.`)
            return;
        }

        await this.mqtt.reply_status_update(cache[data.id], 'failed')
        console.dir(data)
    }
}

exports.sendGatewayMessage = async (message, phone_number, config) => {
    return new Promise((resolve, reject) => {
        axios({
            url: "https://smsgateway.me/api/v4/message/send",
            method: "POST",
            headers: {
                "Authorization": config.api_key,
                "Content-Type": "application/json"
            },
            data: [
                {
                    "phone_number": phone_number,
                    "message": message,
                    "device_id": config.device_id
                }
            ]
        })
        .then(response => {
            if (response.status == 200) {
                resolve(response.data[0].id)
            }else {
                console.error(response.statusText)
                reject()
            }
        })
        .catch(error => {
            console.error(error)
            reject();
        })
    })
}