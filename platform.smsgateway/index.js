// smsgateway.me integration service for GGRM messaging
// MIT License

const express = require("express")
const body_parser = require("body-parser")
const cors = require("cors")
const axios = require("axios").default;
const MQTT = require("./mqtt");
const GatewayCallbacks = require("./gateway")

let gwCache = {};

async function get_config() {
    return new Promise((resolve, reject) => {
        axios.get("http://config:3000/smsgateway")
        .then(response => {
            if (response.status == 200) {
                console.log("Loaded config")
                resolve(response.data)
            }
        })
        .catch(error => {
            console.error("Loading config failed.")
            console.error(error)
            reject();
        })        
    })
}

async function setup() {
    const config = await get_config()
    const mqtt = new MQTT.interface({
        "platform": {
            "name": "smsgateway",
            "friendly_name": "SMS",
            "fa_icon": "far fa-comments",
            "priority": false,
            "limited": true,
            "reply_available": config.service.enable_replies == "yes" ? true : false
        }
    });
    const callbacks = new GatewayCallbacks.GatewayCallbacks(mqtt);
    const app = new express()
    app.use(cors())
    app.use(body_parser.json())
    
    // SMSGateway Interface
    app.post("/message", async (req, res) => {
        res.sendStatus(200);
        callbacks.new_message(req.body)
    })

    app.post("/sent", async(req, res) => {
        res.sendStatus(200)
        callbacks.message_send(req.body, gwCache)
    })

    app.post("/failed", async(req, res) => {
        res.sendStatus(200)
        callbacks.message_failed(req.body, gwCache)
    })

    // Ledger communications
    app.post("/api/reply", async (req, res) => {
        // Messages get an ID from SMSGateway, store it.
        res.sendStatus(204);
        let message;
        if (config.service.message_mark) {
            message = req.body.text + config.service.message_mark
        }else {
            message = req.body.text
        }
        const msgGwId = await GatewayCallbacks.sendGatewayMessage(
            message,
            req.body.author.name,
            config.service
        )
        .catch(async () => {
            await mqtt.reply_status_update(req.body, 'failed')
            return;
        })
        // Alert ledger of messaging pending
        await mqtt.reply_status_update(req.body, 'pending')

        gwCache[msgGwId] = req.body
    })

    app.listen(1234, () => {
        console.log("Started listening on port 1234.")
    })
}

setup();