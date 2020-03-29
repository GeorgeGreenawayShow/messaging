# Authentication

The GGRM Messaging platform has a central auth service, it handles all staff login for messaging
and the website.

A collection of CLI tools are in /tools/ for managing the authentication service. They should be run
from a shell that has access to the authentication network.

This API must use HTTPs if exposed to the internet as passwords are not encrypted in transit.

## Tokens

Active session tokens will be in the format of
`ggrm-t-[30 character random string]-x`

## Database Schema

{
    "username": "A string username",
    "password": "bcrypt'd password",
    "token": "The currently active token or null",
    "token_expires": "timestamp 10 days in the future from login",
    "avatar": "avatar image url"
}

## HTTP API

### GET /api/auth

Used by other services to check if a token is valid
Returns user object.

- Auth required.

> 200 - OK + JSON
> 401 - UNAUTHORISED

### POST /api/auth/login

Used to create a token from username/password.

JSON payload:

{
    "username": "",
    "password": ""
}

- Auth required.

> 200 - OK + {"token": "Token"}
> 401 - UNAUTHORISED

### DELETE /api/auth

Used to logout of the service, expires the token

HEADERS:
authorization=token

> 204 - NO CONTENT
> 401 - UNAUTHORIZSED

### PUT /api/user

Create a new user

JSON payload:

{
    "username": "",
    "password": "",
    "avatar": ""
}

- Auth required.

> 204 OK
> 409 - CONFLICT (user already exists)
> 401 - UNAUTHORISED

### DELETE /api/user/username

Delete a user.

- Auth required.

> 204 OK
> 404 - NOT FOUND
> 401 - UNAUTHORISED
