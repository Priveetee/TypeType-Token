<div align="center">
  <img src="https://raw.githubusercontent.com/TypeType-Video/TypeType/main/assets/banner.svg" alt="TypeType" width="100%">
  <h1>TypeType-Token</h1>
  <p>YouTube Proof-of-Origin token service for TypeType-Server.</p>
</div>

<div align="center">

[![Runtime](https://img.shields.io/badge/runtime-Bun-fbf0df)](https://bun.sh)
[![BotGuard](https://img.shields.io/badge/botguard-bgutils--js-222222)](https://github.com/LuanRT/BgUtils)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

TypeType-Token generates YouTube PO tokens and disposable YouTube login sessions for TypeType-Server. The frontend never calls this service directly.

It runs as a small Bun service inside the TypeType stack and is consumed over HTTP by the backend.

## What this is

A dedicated token microservice for the YouTube BotGuard and Proof-of-Origin flow.

It fetches visitor data, runs BotGuard inside Playwright Chromium, generates integrity tokens, caches the browser attestation in memory, and returns PO token data to TypeType-Server.

## What this is not

- Not a public API for browsers.
- Not a frontend dependency.
- Not an extraction service.
- Not a general YouTube client.

## Stack

| Role | Tool |
|---|---|
| Runtime | Bun |
| HTTP server | `Bun.serve()` |
| Browser runtime | Playwright Chromium |
| BotGuard compatibility types | `bgutils-js` |
| Cache | In-memory process cache |
| Tests | `bun:test` |
| Lint and format | Biome |

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/potoken?videoId=<id>` | Returns PO token data for one YouTube video ID |
| `GET` | `/subtitles?videoId=<id>` | Returns YouTube caption tracks with PO token injection |

Response shape:

```json
{
  "poToken": "...",
  "visitorData": "...",
  "streamingPot": "..."
}
```

Errors return HTTP `500` with:

```json
{ "error": "descriptive message" }
```

## Internal remote login

Remote login is disabled by default and is only for TypeType-Server.

| Method | Path | Description |
|---|---|---|
| `POST` | `/youtube-remote-login/start` | Starts one disposable Chromium context |
| `GET` | `/youtube-remote-login/{sessionId}` | Internal WebSocket for frames and inputs |
| `DELETE` | `/youtube-remote-login/{sessionId}` | Cancels and destroys the context |

All remote login calls require:

```text
X-Internal-Token: <shared secret>
```

Start request:

```json
{
  "serverSessionId": "...",
  "userId": "...",
  "callbackUrl": "http://typetype-server/internal/callback",
  "ttlMs": 480000
}
```

Completion is posted back to `callbackUrl` with cookies in Netscape format and the captured `poToken`. Cookies and `poToken` are not sent through the WebSocket.

Remote login env:

```text
YOUTUBE_REMOTE_LOGIN_ENABLED=true
YOUTUBE_REMOTE_LOGIN_INTERNAL_TOKEN=<shared secret>
YOUTUBE_REMOTE_LOGIN_CALLBACK_ORIGIN=http://localhost:8080
YOUTUBE_REMOTE_LOGIN_MAX_SESSIONS=2
YOUTUBE_REMOTE_LOGIN_FRAME_FPS=10
YOUTUBE_REMOTE_LOGIN_MAX_FRAME_BYTES=524288
YOUTUBE_REMOTE_LOGIN_HEADLESS=false
YOUTUBE_REMOTE_LOGIN_DISABLE_AUTOMATION_CONTROLLED=true
YOUTUBE_REMOTE_LOGIN_PROBE_URL=https://music.youtube.com/watch?v=09839DpTctU
YOUTUBE_REMOTE_LOGIN_BROWSER_CHANNEL=<optional chrome channel>
YOUTUBE_REMOTE_LOGIN_USER_AGENT=<optional Chrome UA>
```

## Runtime

Run from source:

```bash
bun run src/index.ts
```

Build and run the production bundle:

```bash
bun build src/index.ts --outfile dist/index.js --target bun
bun dist/index.js
```

The service listens on port `8081`.

## Development

```bash
bun install
bun test
bun run lint
```

## Docker tags

Container tags are published to GHCR with:

| Tag | Source |
|---|---|
| `latest` | Main branch builds |
| `beta` | Dev branch beta builds |
| `ghcr.io/typetype-video/typetype-token-beta:latest` | Dev branch beta image |
| `sha-<short-sha>` | Every build |
| `main` | Main branch |
| `v*` | Git release tags |

## Related projects

- [TypeType](https://github.com/TypeType-Video/TypeType) is the central stack and issue tracker.
- [TypeType-Server](https://github.com/TypeType-Video/TypeType-Server) calls this service for token data.
- [TypeType-Frontend](https://github.com/TypeType-Video/TypeType-Frontend) never calls this service directly.

## Acknowledgments

- [deniscerri/ytdlnis](https://github.com/deniscerri/ytdlnis) for the BotGuard and PO token reference flow.
- [LuanRT/BgUtils](https://github.com/LuanRT/BgUtils) for `bgutils-js`.
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) for Innertube compatibility references.

## License

MIT. See [LICENSE](LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency notices.
