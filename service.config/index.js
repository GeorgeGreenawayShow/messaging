// GGRM Configuration Service
// MIT License 

const express = require("express");
const yaml = require("yaml");
const fs = require("fs");

let config = {}
const app = new express();

fs.readFile("./config.yaml", (error, data) => {
    if (error) {
        console.error(error);
    }else {
        config = yaml.parse(data.toString());
        app.listen(3000, () => {
            console.log("[configuration] Now listening on port 3000.")
        });
    }
})

app.get("/status", (req, res) => {
    res.json({"state": "available"})
})

app.get("/:service", (req, res) => {
    const obj = {
        "global": config['global'] || {},
        "service": config[req.params.service] || {}
    }
    res.json(obj)
})