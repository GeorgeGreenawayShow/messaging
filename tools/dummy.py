#!/usr/bin/python3
import os 
import fire
import requests
import config

def string_to_bool(string):
    if string == "y" or string == "yes" or string == "true":
        return True
    else:
        return False

class Commands:
    def platform(self):
        name = input("ℹ Platform name: ")
        friendly = input("ℹ Friendly name: ")
        priority = string_to_bool(input("👆 Priority platform [True/False]: "))
        limited = string_to_bool(input("💰 Limited platform [True/False]: "))
        reply = bool(input("💬 Reply Supported [True/False]: "))

        platform = { "platform": {
            "name": name,
            "friendly_name": friendly,
            "priority": priority,
            "limited": limited,
            "reply_available": reply
        }}

        r = requests.patch(f"{config.dummy_server}/platform", json=platform)
        
        if r.status_code == 204:
            print("👍 Platform updated.")
        else:
            print(f"❌ Failed to update platform: {r.status_code}")

    def send(self, message, author):
        obj = {"message": message, "author": author}

        r = requests.post(f"{config.dummy_server}/message", json=obj)

        if r.status_code == 201:
            print("💬 Message sent.")
        else:
            print("❌ Failed to send message.")

if __name__ == "__main__":
    fire.Fire(Commands)
