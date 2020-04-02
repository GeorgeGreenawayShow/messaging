#!/usr/bin/python3
import fire
import requests
import config
import os

def read_token_file():
    if os.path.exists("token.txt"):
        with open("token.txt", "r+") as f:
            return f.read()
    else:
        print("😢 No token file found, please login with [login]")
        return False

def user_readout(user):
    print(f"🎉 Hi '{user['username']}' - Your session token is valid!")
    print(f"ℹ This session expires at {user['token_expires']}")
    if user['username'] == "setup":
        print("‼ Caution, you're logged in as the setup account, it's highly recommended you make another account and delete this one.")

def print_user(user):
    print(f"🧑 Username: {user['username']}")
    print(f"🏠 Logged in: {user['logged_in']}")
    if "session_expires" in user:
        print(f"⌚ Session expires at: {user['session_expires']}")
    if user['avatar']:
        print(f"🖼 Avatar: {user['avatar']}")
    if "reset_required" in user:
        print("❗ User must change password at next login.")
    print("\n")

class Commands:
    def login(self, username="setup", password="password"):
        """Login to Auth server (uses setup account by default)"""
        r = requests.post(f"{config.auth_server}/api/auth/login", json={
            "username": username,
            "password": password
        })

        if r.status_code == 200:
            print("🎉 Successfully logged in! Writing token to file.")
            with open("token.txt", "w+") as f:
                f.write(r.json()['token'])
        elif r.status_code == 401:
            print(f"❌ Unauthorised: {r.json()}")
        else:
            print(f"😢 Communication error: {r.status_code}")

    def check(self):
        """Checks if the token file is valid"""
        token = read_token_file()
        if token:
            r = requests.get(f"{config.auth_server}/api/auth", headers={"Authorization": token})
            if r.status_code == 200:
                print("🎉 The session token is valid!")
                data = r.json()
                user_readout(data)
            else:
                print("😭 Invalid token, login again with [login]")

    def logout(self, user="self"):
        """Logout user, 'self' to logout own account"""
        token = read_token_file()
        if token and user == "self":
            r = requests.delete(f"{config.auth_server}/api/auth", headers={"authorization": token})
            os.remove("token.txt")
            if r.status_code == 204:
                print("👋 Logged out, bye!")
            else:
                print("‼ Un-graceful logout, deleting file.")

        else:
            r = requests.delete(f"{config.auth_server}/api/user/{user}/session", headers={"authorization": token})
            if r.status_code == 204:
                print(f"👋 Logged out {user}")
            else:
                print("‼ Failed to logout.")

    def users(self):
        """Get a list of all users"""
        token = read_token_file()
        if token:
            r = requests.get(f"{config.auth_server}/api/users", headers={"authorization": token})
            if r.status_code == 200:
                users = r.json()
                for user in users:
                    print_user(user)

    def create(self, user, password, avatar=""):
        """Create a new user"""
        token = read_token_file()
        if token:
            obj = {"username": user, "password": password, "avatar": avatar}
            r = requests.put(f"{config.auth_server}/api/user", json=obj, headers={"authorization": token})
            if r.status_code == 204:
                print(f"✅ Created new user: {user}")
            elif r.status_code == 409:
                print(f"😒 User already exits")
            else:
                print("Auth issue.")

    def delete(self, user):
        """Delete a user"""
        token = read_token_file()
        if token:
            r = requests.delete(f"{config.auth_server}/api/user/{user}", headers={"authorization": token})
            if r.status_code == 204:
                print(f"🗑 User {user} deleted.")
            elif r.status_code == 404:
                print("❌ Invalid user.")
            else:
                print("Auth issue.")

if __name__ == "__main__":
    fire.Fire(Commands)
