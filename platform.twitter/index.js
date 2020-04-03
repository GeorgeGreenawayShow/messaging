// GGRM Twitter Platform
// MIT License

const express = require("express");
const axios = require("axios");
const twitter = require("twitter");
const MQTT = require("./mqtt");

async function get_config() {
    return new Promise((resolve, reject) => {
        axios.get("http://config:3000/twitter")
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
    const mqtt = new MQTT.interface({
        "platform": {
            "name": "twitter",
            "friendly_name": "Twitter",
            "fa_icon": "fab fa-twitter",
            "priority": false,
            "limited": false,
            "reply_available": true
        }
    });
    const config = await get_config()
    const client = new twitter({
        consumer_key: config.service.consumer_key,
        consumer_secret: config.service.consumer_secret,
        access_token_key: config.service.access_token_key,
        access_token_secret: config.service.access_token_secret
    })

    console.log("Config loaded, initalising stream.")

    const stream = client.stream('statuses/filter', {track: 'ggstest'});
    stream.on('data', async (tweet_object) => {
        await mqtt.send_message(
            tweet_object['text'], // Tweet body
            
            {"author": tweet_object['user']['screen_name'], // Author/nick
            "nick": tweet_object['user']['name']},
            
            {"id_str": tweet_object['id_str']} // meta
        )
    })

    stream.on("error", (message) => {
        console.dir(message)
    })
}

setup()