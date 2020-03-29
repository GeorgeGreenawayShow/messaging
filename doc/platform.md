# Platform Service

The following documents the requirements for HTTP and MQTT interfaces for all platform modules.

These standards must be followed to fully implement a platform into the service.

## MQTT

### New message (message-add)
All new messages from platform must be sent to the MQTT topic "message-add", with a JSON payload set out as:

{
    "local_id": "Random string used by the platform module",
    "text": "The message sent",
    "author": "screen name/number",
    "platform": {
        "name": "Common name (sms)",
        "friendly_name": "SMS (displayed in UI)",
        "priority": false (such as donations),
        "limited": true (such as SMS, costs.),
        "reply_available": true
    },
    "timestamp": "The time when the message was first received ISO format",
    "meta": {} // Optional array of metadata, such as Twitter thread IDs
}

### Status message (platform-status-update)
Platform modules are able to send status messages (optional) - these must use the following JSON payload:

{
    "message": "A status message",
    "level": "info/warning/error",
    "platform": {
        "name": "Common name (sms)",
        "friendly_name": "SMS (displayed in UI)",
        "priority": false (such as donations),
        "limited": true (such as SMS, costs.),
        "reply_available": true
    },
    "timestamp": "The time the alert was raised ISO format"
}

### Reply Pending (reply-update)
This topic is raised every time the status of a reply job changes, such as pending -> complete, pending -> failed.

{
    "id": "Reply ID",
    "msg_id": "message id",
    "text": "reply text",
    "staff_author": "",
    "status": "pending/sent/failed"
}

Staff_author is sent byu the caller and should be preserved by the platform (shows the staff author in the table.)

## HTTP

All platform modules must implement the following HTTP API, but may return 501 not implemented if the action
is not possible on that platform.

### POST ack (/api/message/:local_id/ack)

This endpoint is called by the ledger once it has received a message, this could be used to respond to the platform
(i.e like a post on Facebook) or stop an auto-retrying system.

Expect JSON:

{"local_id": "The ID sent on MQTT", "id": "The ledger-ID"}

Respond:

> 201 - No content
> 501 - Not implemented

### POST send (/api/reply)

This endpoint is called by REST or Ledger to reply to a message. The module is free to handle this however it wishes.
The REST API must be answered ASAP, and a reply ack should be sent via 'reply-sent'

Expect JSON:

{
    "id": "reply ID",
    "msg_id": "message id",
    "author": "Author screen name/phone number",
    "staff_author": "Author of the reply.",
    "meta": {} // the meta the original message contained
}

Respond:

> 201 - No content
> 501 - Not implemented 
