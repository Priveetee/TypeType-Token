<div align="center">
  <h1>TypeType-Token</h1>
  <p>YouTube Proof-of-Origin token service for TypeType-Server.</p>
</div>

<div align="center">

[![Runtime](https://img.shields.io/badge/runtime-Bun-fbf0df)](https://bun.sh)
[![BotGuard](https://img.shields.io/badge/botguard-bgutils--js-222222)](https://github.com/LuanRT/BgUtils)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

TypeType-Token generates YouTube PO tokens for TypeType-Server. The frontend never calls this service directly.

It runs as a small Bun service inside the TypeType stack and is consumed over HTTP by the backend.

## What this is

A dedicated token microservice for the YouTube BotGuard and Proof-of-Origin flow.

It fetches visitor data, solves BotGuard challenges, generates integrity tokens, caches results, and returns PO token data to TypeType-Server.

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
| BotGuard challenge | `bgutils-js` |
| Browser runtime | Playwright Chromium |
| Cache | Bun Redis client with Dragonfly |
| Tests | `bun:test` |
| Lint and format | Biome |

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/potoken?videoId=<id>` | Returns PO token data for one YouTube video ID |

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
| `latest` | Default branch builds |
| `sha-<short-sha>` | Every build |
| `main` | Main branch |
| `v*` | Git release tags |

## Related projects

- [TypeType](https://github.com/Priveetee/TypeType) is the deployment stack.
- [TypeType-Server](https://github.com/Priveetee/TypeType-Server) calls this service for token data.
- [TypeType web](https://github.com/Priveetee/TypeType) never calls this service directly.

## Acknowledgments

- [deniscerri/ytdlnis](https://github.com/deniscerri/ytdlnis) for the BotGuard and PO token reference flow.
- [LuanRT/BgUtils](https://github.com/LuanRT/BgUtils) for `bgutils-js`.
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) for Innertube compatibility references.

## License

MIT. See [LICENSE](LICENSE).
