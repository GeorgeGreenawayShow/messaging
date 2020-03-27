// GGRM Messaging - Dummy platform
// MIT License

const winston = require('winston');

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

app.send_message("Test Message", "Nevexo", {"meta": "test"})