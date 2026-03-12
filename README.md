# TypeType-Token

The BotGuard PO token microservice for [TypeType-Server](https://github.com/Priveetee/TypeType-Server).

Generates YouTube Proof-of-Origin tokens via a headless Chromium instance running the BotGuard challenge. Consumed exclusively by TypeType-Server over HTTP on localhost.

Read the [Manifesto](https://github.com/Priveetee/TypeType/blob/main/MANIFESTO.md) to understand the project and the architectural decisions behind this separation.

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
