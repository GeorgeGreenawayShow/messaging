// Ledger MongoDB interface

const MongoClient = require('mongodb').MongoClient;
const randomstring = require("randomstring");

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

    async new_author(name, nick) {
        // Create a new author
        return new Promise(async (resolve, reject) => {
            try {
                const client = await this.connect()
                const tAuthors = client.db("ggrm").collection("authors")
               
                let id = randomstring.generate(10)
                let AuthorObject = {
                    "id": id,
                    "name": name,
                    "nick": nick || name
                }

                this.logger.info(`🙋 Creating new Author: ${name} (${nick || "No nick specified"})`)
                tAuthors.insertOne(AuthorObject).then(() => {
                    resolve(AuthorObject)
                    client.close();
                })
            } catch (e) {
                this.logger.error(e)
                reject(e)
            }
        })
    }

    async new_message(message, authorID, platform, meta) {
        // Create a new message in the database
        return new Promise(async (resolve, reject) => {
            try {
                const client = await this.connect()
                const tMessages = client.db("ggrm").collection("messages")
                
                const MessageID = randomstring.generate(10)
                let MessageObject = {
                    "id": MessageID,
                    "message": message,
                    "author": authorID,
                    "platform": platform,
                    "meta": meta || null

                }

                this.logger.info(`💬 Adding new message, from ${authorID}, message: ${message}.`)
                tMessages.insertOne(MessageObject).then(() => {
                    resolve(MessageObject);
                    client.close();
                })
            } catch (e) {
                this.logger.error(e)
                reject(e)
            }
        })
    }

    async get_messages(count, find) {
        // Get all messages with a limit of [count] (200 default)
        return new Promise(async (resolve, reject) => {
            try {
                const client = await this.connect()
                const tMessages = client.db("ggrm").collection("messages")
                
                // Find all messages & replace authorID with Author object
                tMessages
                .aggregate([
                    {
                        $match: find || {}
                    },
                    {$lookup: {
                        from: "authors",
                        localField: "author",
                        foreignField: "id",
                        as: "author"
                    }},
                    {$unwind: '$author'}
                ])
                .limit(parseInt(count) || 200)
                .toArray().then(data => {
                    resolve(data)
                    client.close();
                })
            } catch (e) {
                this.logger.error(e)
                reject(e)
            }
        })
    }

    async find_author(find) {
        // Screen name/phone number (not nick)
        return new Promise(async (resolve, reject) => {
            try {
                const client = await this.connect()
                const tAuthors = client.db("ggrm").collection("authors")
                
                // Add messages to author
                tAuthors.aggregate(
                    [
                        {$match: find || {}},
                        {$lookup: {
                            from: "messages",
                            localField: 'id',
                            foreignField: 'author',
                            as: 'messages'
                        }}
                    ]
                )                
                .toArray().then(data => {
                    resolve(data)
                    client.close();
                })
            } catch (e) {
                this.logger.error(e)
                reject(e)
            }
        })
    }

    // DELETE

    async delete_message(id) {
        return new Promise(async (resolve, reject) => {
            try {
                const client = await this.connect()
                const tMessages = client.db("ggrm").collection("messages")

                tMessages.deleteOne({"id": id || 0}).then((result) => {
                    this.logger.info("🗑 Deleting message: " + id)
                    client.close();
                    resolve(result['result']['n'])
                })
            } catch (e) {
                this.logger.error(e)
                reject(e)
            }
        })
    }

    async delete_author(id) {
        return new Promise(async (resolve, reject) => {
            try {
                const client = await this.connect()
                const tAuthors = client.db("ggrm").collection("authors")

                tAuthors.deleteOne({"id": id || 0}).then((result) => {
                    this.logger.info("🗑 Deleting author: " + id)
                    client.close();
                    resolve(result['result']['n'])
                })
            } catch (e) {
                this.logger.error(e)
                reject(e)
            }
        })
    }

    // UPDATE

    async update_author_nick(id, nick) {
        return new Promise(async (resolve, reject) => {
            try {
                const client = await this.connect()
                const tAuthors = client.db("ggrm").collection("authors")

                tAuthors.updateOne({"id": id || 0}, {$set: {"nick": nick}}).then((result => {
                    this.logger.info(`👍 Updating ${id}'s nick to ${nick}`)
                    client.close();
                    resolve(result['result']['n'])
                }))
            } catch (e) {
                this.logger.error(e)
                reject(e)
            }
        })
    }
}