// Collections used by service.auth

db.createCollection("users")

let user_object = {
    "username": "setup",
    "password": "$2b$10$8LVeAjHSrMkXCNKNXNNGO.ju6rcpswz122k6yvctfRo3l/p4mSb6W",
    "token": null,
    "token_expires": null,
    "avatar": "",
    "reset_required": false
}

db.users.insertOne(user_object)