# TypeType-Token

The BotGuard PO token microservice for [TypeType-Server](https://github.com/Priveetee/TypeType-Server).

Generates YouTube Proof-of-Origin tokens via a headless Chromium instance running the BotGuard challenge. Consumed exclusively by TypeType-Server over HTTP on localhost.

Read the [Manifesto](https://github.com/Priveetee/TypeType/blob/main/MANIFESTO.md) to understand the project and the architectural decisions behind this separation.

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

## License

MIT
