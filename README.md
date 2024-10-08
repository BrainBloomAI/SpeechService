# BrainBloomAI's Speech Service
Handles speech synthesis and recognition within BrainBloomAI with multilanguage support

- Recognition: Uses websockets to streams raw audio data in opus codecs in mpeg containers for live transcription
- Synthesis: Uses simple HTTP requests to obtain streamable audio data in aac codecs

# Startup
To startup a development server,
```
npm i
npm start
```

Alternatively, you may use `pnpm` as a drop-in replacement for `npm`

Lightweight server with no build processes

## /src/config.js
Configuration for frontend
- `.PORT`: (number) port number the Speech Service server will run on
- `.invokeOrigin`: (string) URL address of BrainBloomAI's frontend (e.g. "http://localhost:8000", no leading forward slash), used to establish CORS policy for web sockets establishment

## .env
Only one variable is used to maintain sessions
- `DEEPGRAM_API_KEY`: (string) DeepGram's supplied API key

# Dependencies
- [`express.js`](https://expressjs.com/): NodeJS web framework
- [`socket.IO`](https://socket.io/): NodeJS web socket library
- [`Deepgram JS SDK`](https://github.com/deepgram/deepgram-js-sdk): JS SDK to interact with Deepgram's API

©️ 2024 BrainBloomAI Team. All rights reserved.
