// GGRM Messaging Platform - MQTT Interface
// 1.0 - MIT License.

const mqtt = require("mqtt")
const randomstring = require('randomstring');

exports.interface = class {
    constructor(platform) {
        this.platform = platform
        this.client = mqtt.connect('mqtt://mosquitto')
        this.client.on('connect', async () => {this.mqtt_connet()})
    }

    set_platform(platform) {
        this.platform = platform
    }

    async mqtt_connet() {
        console.log("Connected to Mosquitto.")
    }

    async send_message(message, author, meta) {
        // Docs/platform.md
        // message-add

        const obj = {
            "local_id": randomstring.generate(10),
            "text": message,
            "author": author.author,
            "nick": author.nick || undefined,
            "platform": this.platform['platform'],
            "timestamp": new Date().toISOString(),
            "meta": meta || null
        }

        await this.client.publish("message-add", JSON.stringify(obj))
    }

    async reply_status_update(id, msg_id, text, staff_author, status) {
        let obj = {
            "id": id,
            "msg_id": msg_id,
            "text": text,
            "staff_author": staff_author,
            "status": status
        }
        await this.client.publish("reply-update", JSON.stringify(obj))
    }
}