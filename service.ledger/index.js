// GGRM Ledger - The messaging platform central ledger.
// MIT License - Cameron Fleming 2020.

const winston = require('winston');
const mongo = require("./src/mongo");
const express = require("express");
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

// -- MQTT Handlers --

const mqtt_client = mqtt.connect("mqtt://mosquitto")

mqtt_client.on('connect', () => {
    logger.verbose("🎉 Connected to MQTT.")
    mqtt_client.subscribe("message-add")
})

mqtt_client.on('message', (topic, message) => {
    logger.verbose(`📣 MQTT: ${topic} - ${message}`)
})

async function create_author() {
    await data.new_author("Nevexo", "Cameron")
}

app.listen(8080, () => {
    logger.verbose("🎉 API server started.")
})