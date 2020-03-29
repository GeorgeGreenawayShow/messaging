// GGRM Authentication
// MongoDB wrapper

const MongoClient = require('mongodb').MongoClient;
const randomstring = require("randomstring");
const bcrypt = require("bcrypt");

exports.Database = class {
    constructor(logger) {
        this.logger = logger
    }

    async connect() {
        return new Promise((resolve, reject) => {
            MongoClient.connect("mongodb://mongodb:27017", {
                useNewUrlParser: true,
                useUnifiedTopology: true
            }, (err, client) => {
                err ? reject(err) : resolve(client)
            })
        })
    }

    // GET

    async get_user(lookup) {
        return new Promise(async (resolve, reject) => {
            try {
                const client = await this.connect()
                const tUsers = client.db("ggrm").collection("users")
               
                tUsers.find(lookup).toArray()
                .then((result) => {
                    resolve(result)
                    client.close();
                })
                .catch((error) => {
                    this.logger.error(error.toString())
                    client.close();
                    reject()
                })
            } catch (e) {
                this.logger.error(e)
                reject(e)
            }
        })
    }

    async new_user(username, password, avatar) {
        // Create a new user
        return new Promise(async (resolve, reject) => {
            try {
                const client = await this.connect()
                const tUsers = client.db("ggrm").collection("users")
               
                const hashed_password = await bcrypt.hash(password, 10)
                
                let UserObject = {
                    "username": username,
                    "password": hashed_password,
                    "token": null,
                    "token_expires": null,
                    "avatar": avatar || "https://avatars1.githubusercontent.com/u/4786918?s=460&u=16b6b6544289ee24031f25835e1c9b2173a250f6&v=4"
                }

                this.logger.info(`🙋 Creating new User: ${username}`)
                tUsers.insertOne(UserObject).then(() => {
                    resolve()
                    client.close();
                })
            } catch (e) {
                this.logger.error(e)
                reject(e)
            }
        })
    }

    // DELETE 

    async delete_user(username) {
        return new Promise(async (resolve, reject) => {
            try {
                const client = await this.connect()
                const tUsers = client.db("ggrm").collection("users")
               
                this.logger.info(`🗑 Deleting User: ${username}`)
                tUsers.deleteOne({"username": username}).then((result) => {
                    resolve(result['result']['n'])
                    client.close();
                })
            } catch (e) {
                this.logger.error(e)
                reject(e)
            }
        })
    }

    // UPDATE

    async update_token(username, token, expire_time) {
        return new Promise(async (resolve, reject) => {
            try {
                const client = await this.connect()
                const tUsers = client.db("ggrm").collection("users")
               
                tUsers.updateOne(
                    {"username": username},
                    {$set: {"token": token, "token_expires": expire_time}}
                ).then((result) => {
                    resolve(result['result']['n'])
                    client.close();
                })
            } catch (e) {
                this.logger.error(e)
                reject(e)
            }
        })
    }
}