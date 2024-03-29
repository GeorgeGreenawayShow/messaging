// GGRM Auth Token generator

const randomstring = require("randomstring")
const bcrypt = require("bcrypt")

exports.Tokens = class {
    constructor(logger, database) {
        this.logger = logger;
        this.database = database;
        this.token_cache = {};
    }

    gen_token(temp) {
        let token;
        let expire_stamp = new Date();
        if (!temp) {
            token = `ggrm-t-${randomstring.generate(30)}-x`
            expire_stamp.setDate(expire_stamp.getDate() + 5); // Expire after 5 days
        }else {
            token = `RST-t-${randomstring.generate(30)}-x`
            expire_stamp.setTime(expire_stamp.getTime() + 10*60000); // Expire after 10 minutes
        }

        return [token, expire_stamp]
    }

    async check_token(token) {
        // Takes a token and either returns False
        // or the user object.
        return new Promise(async (resolve, reject) => {
            // Check RAM cache.
            if (this.token_cache[token] != undefined) {
                if (this.token_cache[token].token_expires < new Date()) {
                    // This cache token has expired, delete it.
                    delete this.token_cache[token];
                    // Continue on to check the DB
                }else {
                    // This token is still valid, approve.
                    resolve(this.token_cache[token])
                    return; // Cancel DB check.
                }
            }

            // Check database
            let user = await this.database.get_user({"token": token})
            if (user.length == 0) {
                // Invalid token (not linked to a user)
                resolve(false)
            }else {
                // Token is in the DB, check if it's valid
                if (user[0].token_expires < new Date()) {
                    // token expired
                    resolve(false)
                    await this.user_logout(user[0].username, token)
                }else {
                    // token is still valid
                    let return_object = {
                        "username": user[0].username,
                        "token_expires": user[0].token_expires,
                        "avatar": user[0].avatar,
                        "temp_token": user[0].token.startsWith("RST-") ? true : false
                    }

                    // Add token to cache
                    this.token_cache[token] = return_object
                    // Return user object.
                    resolve(return_object)
                }
            }
        })
    }

    async user_logout(username, token) {
        // Expires a token
        return new Promise(async (resolve, reject) => {
            delete this.token_cache[token];
            let result = await this.database.update_token(username, null, null)
            if (result == 1) {
                resolve()
            }else {
                reject()
            }
        })
    }

    async user_login(username, password) {
        return new Promise(async (resolve, reject) => {
            // Get the user
            let user = await this.database.get_user({"username": username})
            if (user.length != 0) {
                user = user[0]
            }else {
                resolve(false);
                return;
            }

            // Check password
            const pw_result = await bcrypt.compare(password, user.password)
            if (pw_result) {
                // Generate token and authenticate user.
                // Check if a password reset is required
                let token = user['reset_required'] ? this.gen_token(true) : this.gen_token(false)
                await this.database.update_token(username, token[0], token[1]);
                resolve(token[0]);
            }else {
                // Invalid
                resolve(false);
            }
        })
    }

    clear_cache() {
        // Clear the cache
        // Usually used when a user is deleted.
        this.token_cache = {}
    }

}