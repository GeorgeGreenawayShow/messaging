// GGRM Authentication Service
// MIT License

const express = require("express");
const cors = require("cors");
const body_parser = require("body-parser")
const axios = require("axios");
const Database = require("./src/mongo")
const Tokens = require("./src/tokens")
const winston = require("winston")

// Setup Winston logger
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

const database = new Database.Database(logger)
const tokens = new Tokens.Tokens(logger, database)

// Setup express
const app = express()
app.use(cors())
app.use(body_parser.json())
app.use(async (req, res, next) => {
    // Auth handler
    logger.verbose(`Auth API Act ${req.originalUrl}`)
    
    if (req.originalUrl == "/api/auth/login") {
        // Skip auth check for login URL.
        next();
        return;
    }

    if (req.headers.authorization == undefined) {
        res.sendStatus(401)
        logger.verbose("! No authorization header with request.")
        return;
    }

    const user = await tokens.check_token(req.headers.authorization)

    if (!user) {
        res.sendStatus(401)
        logger.verbose("! Invalid auth token with request.")
        return;
    }else {
        req.user_object = user
        next();
    }
})

app.put("/api/user", async (req, res) => {
    if (req.body.username == undefined || req.body.password == undefined) {
        res.sendStatus(400);
        return;
    }
    try {
        // Check if the user exists
        let users = await database.get_user({"username": req.body.username})
        if (users.length == 0) {
            // Create a new user
            await database.new_user(req.body.username, req.body.password, req.body.avatar || null)
            res.sendStatus(204) // NO CONTENT
        }else {
            // User already exists (conflict)
            res.sendStatus(409) // CONFLICT
        }
    }catch (e) {
        logger.error(e)
        res.sendStatus(500) // Server error.
    }
})

app.delete("/api/user/:username", async (req, res) => {
    let result = await database.delete_user(req.params.username)
    tokens.clear_cache()
    result == 0 ? res.sendStatus(404) : res.sendStatus(204)
})

app.get("/api/auth", (req, res) => {
    // Used for checking authentication
    res.json(req.user_object)
})

app.delete("/api/auth", async (req, res) => {
    // Logout the user
    await tokens.user_logout(req.user_object['username'], req.headers.authorization);
    res.sendStatus(204);
})

app.post("/api/auth/login", async (req, res) => {
    // Login a user
    if (req.body.username == undefined || req.body.password == undefined) {
        res.sendStatus(400)
    }else {
        let token = await tokens.user_login(req.body.username, req.body.password)
        if (token == false) {
            res.sendStatus(401)
        }else {
            res.json({"token": token})
        }
    }
})

app.listen(9999, () => {
    logger.info("Auth service active.")
    console.dir(tokens.gen_token())
})