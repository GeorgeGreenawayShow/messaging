// GGRM Messaging - Dummy platform
// MIT License

const winston = require('winston');
const express = require("express");
const body_parser = require("body-parser");

const api = express();

api.use(body_parser.json());

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

const mqttMod = require("./mqtt");
const app = new mqttMod.interface(
    logger,
    {
        "platform": {
            "name": "dummy",
            "friendly_name": "Dummy Service",
            "priority": false,
            "limited": true,
            "reply_available": true
        }
    }
);

api.post("/message", (req, res) => {
    app.send_message(req.body['message'], req.body['author'], {"meta": "Dummy Platform"})
    console.dir(req.body['message'], req.body['author'], {"meta": "Dummy Platform"})
    res.sendStatus(201)
})

api.patch("/platform", (req, res) => {
    app.set_platform(req.body)
    res.sendStatus(204)
})

api.listen(1234, () => {
    console.log("👍 Listening on 1234")
})