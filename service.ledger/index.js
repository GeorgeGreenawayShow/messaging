// GGRM Ledger - The messaging platform central ledger.
// MIT License - Cameron Fleming 2020.

const winston = require('winston');
const mongo = require("./src/mongo");
const express = require("express");
const axios = require("axios");
const randomstring = require("randomstring");
const cors = require("cors");
const body_parser = require("body-parser");
const mqtt = require("mqtt");

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL,
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

const data = new mongo.Database(logger);
const app = express()
app.use(cors())
app.use(body_parser.json())

// -- Routes / GET / messages --

app.get("/api/messages", async (req, res) => {
    // Get all messages
    const messages = await data.get_messages(req.query.limit || null)
    res.json(messages)
})

app.get("/api/message/:id", async (req, res) => {
    // Get a specific message by id
    const message = await data.get_messages(1, {"id": req.params.id})
    if (message.length == 0) {
        res.sendStatus(404)
    }else {
        res.json(message[0])
    }
})

// -- Routes / GET / authors --

app.get("/api/authors", async (req, res) => {
    // Get all authors
    const authors = await data.find_author({})
    res.json(authors)
})

app.get("/api/author/:id", async (req, res) => {
    // Get a specific author by id
    const author = await data.find_author({"id": req.params.id})
    if (author.length == 0) {
        res.sendStatus(404)
    }else {
        res.json(author[0])
    }
})

// -- Routes / DEL / messages --

app.delete("/api/message/:id", async (req, res) => {
    // Delete a message.
    const result = await data.delete_message(req.params.id)
    result == 1 ? res.sendStatus(204) : res.sendStatus(404)
})

// -- Routes / DEL / Authors  --

app.delete("/api/author/:id", async (req, res) => {
    // Delete a message.
    const result = await data.delete_author(req.params.id)
    result == 1 ? res.sendStatus(204) : res.sendStatus(404)
})

// -- Routes / PATCH / Authors --

app.patch("/api/author/:id", async (req, res) => {
    // Update a user's nickname
    if (req.body['nick'] == undefined) {
        res.sendStatus(400)
    }else {
        const result = await data.update_author_nick(req.params.id, req.body['nick'])
        result == 1 ? res.sendStatus(204) : res.sendStatus(404)
    }
})

// -- Routes / POST / Reply --

app.post("/api/message/:id/reply", async (req, res) => {
    // Reply to a message.
    let message = await data.get_messages(1, {"id": req.params.id})
    if (message.length == 0) {
        res.sendStatus(404);
        return;
    }else {
        message = message[0]
    }

    if (req.body.message == undefined) {
        res.sendStatus(400);
        return;
    }

    const reply_id = randomstring.generate(10)

    logger.info(`💬 Replying to message ${req.params.id} - Reply ID: ${reply_id} - Orignal message ID: ${message.id}`)
    // Send a reply payload to platform service

    // TODO: Add staff_author from auth service.
    let json_payload = {
        "id": reply_id,
        "msg_id": message.id,
        "author": message.author,
        "text": req.body.message,
        "staff_author": "NYI"
    }

    axios.post(`http://${message.platform.name}:${process.env.PLATFORM_API_PORT}/api/reply`, json_payload)
    .then((response) => {
        response.status == 204 ? res.sendStatus(204) : res.sendStatus(501)
    })
    .catch(error => {
        logger.error(error.toString());
        res.sendStatus(500)
    })
})

// -- MQTT Handlers --

const mqtt_client = mqtt.connect("mqtt://mosquitto")

mqtt_client.on('connect', () => {
    logger.verbose("🎉 Connected to MQTT.")
    mqtt_client.subscribe("message-add")
    mqtt_client.subscribe("reply-update")
})

mqtt_client.on('message', async (topic, message) => {
    logger.verbose(`📣 MQTT: ${topic} - ${message}`)
    message = JSON.parse(message)
    // New message handler
    if (topic == "message-add") {
        try {
            // New message, first check if the author exists.
            let author = await data.find_author({"name": message['author']})
            // If no author, create a new one.
            author.length == 0 ? author = await data.new_author(message['author']) : author = author[0]
            author = author['id']

            await data.new_message(message['text'], author, message['platform'], message['meta'])

        } catch (e) {
            logger.error(e)
        }
        
    }

    // Reply update handler
    if (topic == "reply-update") {
        if (message['status'] == "sent") {
            try {
                await data.add_reply(message['msg_id'], message['id'], message['text'], message['staff_author'] || "No Author")
            } catch (e) {
                logger.error(e)
            }
        }
    }
})

app.listen(8080, () => {
    logger.verbose("🎉 API server started.")
})