# TypeType-Token

The BotGuard PO token microservice for [TypeType-Server](https://github.com/Priveetee/TypeType-Server).

Generates YouTube Proof-of-Origin tokens via a headless Chromium instance running the BotGuard challenge. Consumed exclusively by TypeType-Server over HTTP on localhost.

## Docker Tags

Container tags are published to GHCR with:

- `latest` on default branch builds
- `sha-<short-sha>` on every build
- branch tags (for example `main`)
- Git tags (for example `v1.2.3`)
- release tags from `v*` (`v1.2.3` publishes `1.2.3` and `1.2`)

Examples:

- commit `dbc5019` on `main` publishes `sha-dbc5019`, `main`, and `latest`
- Git tag `v1.2.3` publishes `v1.2.3`, `1.2.3`, and `1.2`

## Stack

| Role | Tool |
|---|---|
| Runtime / Package manager | Bun |
| HTTP server | `Bun.serve()` |
| BotGuard execution | Playwright (Chromium headless) |
| BotGuard challenge parsing | `bgutils-js` |
| Lint / Format | Biome |
| Tests | `bun:test` |

## Acknowledgments

Huge thanks to the projects that made this service possible.

- [deniscerri/ytdlnis](https://github.com/deniscerri/ytdlnis) - reference implementation for the BotGuard and PO token flow
- [LuanRT/BgUtils](https://github.com/LuanRT/BgUtils) - `bgutils-js`, used to parse and solve BotGuard challenges
- [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) - reference for Innertube client behavior and request compatibility

## License

MIT
