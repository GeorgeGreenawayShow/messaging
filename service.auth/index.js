// GGRM Authentication Service
// MIT License

const express = require("express");
const cors = require("cors");
const body_parser = require("body-parser")
const axios = require("axios");
const Database = require("./src/mongo")
const Tokens = require("./src/tokens")
const randomstring = require("randomstring")
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
    
    if (req.originalUrl == "/api/auth/login" || req.originalUrl == "/status") {
        // Skip auth check for login URL and status.
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
    }
    // Check for reset-password token
    if (user.temp_token) {
        // The user is using a reset token, only allow access to password reset.
        if (req.originalUrl == "/api/user/reset") {
            req.auth_type = "reset"
            req.user_object = user
            next();
            return;
        }else {
            res.status(401)
            res.json({"message": "You're logged in with a password reset token, you may only change your password."})
            return;
        }
    }

    req.auth_type == "normal"
    req.user_object = user
    next();
})

app.put("/api/user", async (req, res) => {
    if (req.body.username == undefined) {
        res.sendStatus(400);
        return;
    }
    let password = req.body.password || randomstring.generate(5)
    try {
        // Check if the user exists
        let users = await database.get_user({"username": req.body.username})
        if (users.length == 0) {
            // Create a new user
            await database.new_user(req.body.username, password, req.body.avatar || null, req.body.password == undefined ? false : true)

            if (req.body.password) {
                res.sendStatus(204) // NO CONTENT
            }else {
                res.json({"password": password})
            }
        }else {
            // User already exists (conflict)
            res.sendStatus(409) // CONFLICT
        }
    }catch (e) {
        logger.error(e)
        res.sendStatus(500) // Server error.
    }
})

app.post("/api/user/reset", async (req, res) => {
    // Set user password, requires normal/reset token
    if (req.auth_type == "reset" && req.body.user != req.user_object['username']) {
        res.status(401)
        res.json({"message": "You're logged in with a RESET-PASSWORD token, you may not update somebody elses password."})
        return;
    }

    // Set the password
    let new_pass = req.body.password || randomstring.generate(5)
    // Update the user, force password reset if no password was sent. (temp password mode)
    let result = await database.update_user(req.body.user, new_pass, req.body.password == undefined ? true : false)
    tokens.clear_cache();
    
    if (result == 1) {
        if (req.body.password) {
            res.sendStatus(204)
        }else {
            res.json({"password": new_pass})
        }
    }else {
        res.sendStatus(404)
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

app.delete("/api/user/:username/session", async (req, res) => {
    // Logout another user
    let user = await database.get_user({"username": req.params.username})
    if (user.length == 0) {
        res.sendStatus(404)
        return;
    }
    user = user[0]

    // Deauthenticate user
    await tokens.user_logout(user['username'], user['token'])
    res.sendStatus(204)
})

app.post("/api/auth/login", async (req, res) => {
    // Login a user
    if (req.body.username == undefined || req.body.password == undefined) {
        res.sendStatus(400)
    }else {
        let token = await tokens.user_login(req.body.username, req.body.password)
        if (token == false) {
            res.status(401)
            res.json({"message": "Invalid username/password combination."})
        }else {
            res.json({"token": token})
        }
    }
})

app.get("/api/users", async (req, res) => {
    let o_users = []
    let users = await database.get_user({})
    
    for await (user of users) {
        o_users.push({
            "username": user['username'],
            "logged_in": user.token ? true : false,
            "session_expires": user.token_expires || undefined,
            "avatar": user['avatar'],
            "reset_required": user.reset_required ? true : undefined
        })
    }

    res.json(o_users)
})

app.get("/status", (req, res) => {
    res.json({"state": "available"})
})

app.listen(9999, () => {
    logger.info("Auth service active.")
    console.dir(tokens.gen_token())
})