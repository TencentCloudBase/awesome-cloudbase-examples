# WebSocket Example

A simple Node.js WebSocket server/client demo that shows real-time bidirectional communication on a CloudBase HTTP function.

## Project Structure

```
http-nodejs-websocket/
├── index.js               # WebSocket server (entry)
├── client.js              # Node.js CLI client
├── client-browser.html    # Browser client
├── scf_bootstrap          # HTTP function entrypoint (`node index.js`)
├── cloudbaserc.json       # CloudBase deploy config
├── package.json           # depends on `ws`
└── README*.md
```

## Quick Start (Local)

```bash
cd http-nodejs-websocket
npm install
npm start                    # starts on http://localhost:9000, ws://localhost:9000
```

In another terminal, connect using either client:

```bash
# Node.js CLI client
node client.js ws://localhost:9000 my-client

# Or open client-browser.html in the browser
```

## Deploy as CloudBase HTTP Function

```bash
tcb fn deploy --yes -e <ENV_ID>
tcb service create -e <ENV_ID> -p /http-nodejs-websocket -f http-nodejs-websocket
```

The WebSocket access URL will be `wss://<env>.service.tcloudbase.com/http-nodejs-websocket/`.

## Features

- Broadcast messages to all connected clients
- Per-client `clientId` (auto-assigned if not provided)
- Welcome / join / leave system messages
- Graceful disconnect handling

## References

- [CloudBase HTTP function docs](https://docs.cloudbase.net/cbrf/intro)
- Source: this repository
