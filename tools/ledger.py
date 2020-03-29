import fire
import config
import os 
import requests

def read_token_file():
    if os.path.exists("token.txt"):
        with open("token.txt", "r+") as f:
            return f.read()
    else:
        print("😢 No token file found, please login with [login]")
        return False

def print_message(message):
    print("--------------------")
    print(f"ℹ ID: {message['id']}")
    print(f"🧑 Author: {message['author']['name']} (a.k.a {message['author']['nick']}) (ID: {message['author']['id']})")
    print(f"💬 {message['message']}")
    print(f"📱 Platform: {message['platform']['friendly_name']}")

def print_author(author):
    print("-------------------")
    print(f"ℹ ID: {author['id']}")
    print(f"🧑 Name: {author['name']}")
    print(f"🧑 Nick: {author['nick']}")
    print(f"💬 Messages: {len(author['messages'])}")

class Commands:
    def messages(self):
        """Get all active messages"""
        token = read_token_file()
        if token:
            r = requests.get(f"{config.ledger_server}/api/messages", headers={"Authorization": token})
            if r.status_code == 200:
                messages = r.json()
                for message in messages:
                    print_message(message)
            else:
                print("😢 Failed to get data (auth?)")

    def message(self, id):
        """Get specific message"""
        token = read_token_file()
        if token:
            r = requests.get(f"{config.ledger_server}/api/message/{id}", headers={"Authorization": token})
            if r.status_code == 200:
                message = r.json()
                print_message(message)
            else:
                print("😢 Failed to get data (auth?)")

    def delete(self, id):
        """Delete a message"""
        token = read_token_file()
        if token:
            r = requests.delete(f"{config.ledger_server}/api/message/{id}", headers={"Authorization": token})
            if r.status_code == 204:
                print("🗑 Deleted message.")
            elif r.status_code == 404:
                print("❌ Invalid message.")
            else:
                print("😢 Failed to get data (auth?)")


    def authors(self):
        """Get all authors"""
        token = read_token_file()
        if token:
            r = requests.get(f"{config.ledger_server}/api/authors", headers={"Authorization": token})
            if r.status_code == 200:
                authors = r.json()
                for author in authors:
                    print_author(author)

    def author(self, id):
        """Get specific author"""
        token = read_token_file()
        if token:
            r = requests.get(f"{config.ledger_server}/api/author/{id}", headers={"Authorization": token})
            if r.status_code == 200:
                author = r.json()
                print_author(author)
            else:
                print("😢 Failed to get data (auth?)")

    def nick(self, id, nick):
        """Change an authors nickname"""
        token = read_token_file()
        if token:
            r = requests.patch(f"{config.ledger_server}/api/author/{id}", json={
                "nick": nick
            },
            headers={"Authorization": token})

            if r.status_code == 204:
                print("✅ Nick updated!")
                self.author(id)
            elif r.status_code == 404:
                print("❓ Invalid author.")
            else:
                print("😢 Failed to get data (auth?)")

if __name__ == "__main__":
    fire.Fire(Commands)