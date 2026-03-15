# Hot Crown Telegram Bot

Real-time notification bot that broadcasts Hot Crown on-chain game events to a Telegram group. It listens to Solana program logs via WebSocket and posts updates as they happen.

## What it does

### Real-time game event notifications

The bot watches the Hot Crown smart contract and posts a message whenever:

- **Throne Bid** — someone places a bid to claim the throne
- **King Crowned** — bidding ends and a new king is elected
- **Battle Started** — the first attack is launched against the king
- **Attack / Defense** — soldiers are sent to attack or defend during battle
- **King Survives** — the king wins a battle
- **King Defeated** — the king falls and the throne is vacated

Each message includes relevant game stats (pot size, soldier counts, token amounts) and a randomized punchline for flavor.

### Periodic throne status report

Posts a scheduled status update showing who the current king is (full wallet address), the game phase, and key stats. Defaults to every 24 hours, configurable via `KING_POST_INTERVAL_HOURS`.

### Play button

Every message includes an inline "Play Hot Crown" button linking to the game.

## Setup

### Prerequisites

- Node.js 18+
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))
- A Solana RPC endpoint with WebSocket support (e.g. Helius)

### Install and run

```bash
cp .env.example .env
# fill in your .env values

npm install
npm run build
npm start
```

For development:

```bash
npm run dev
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `TG_BOT_TOKEN` | Yes | Telegram bot token from @BotFather |
| `TG_CHAT_ID` | Yes | Target Telegram group chat ID |
| `SOLANA_RPC_URL` | Yes | Solana RPC endpoint (HTTPS) |
| `SOLANA_WS_URL` | Yes | Solana WebSocket endpoint (WSS) |
| `GAME_URL` | Yes | Link to the game (shown as button on all messages) |
| `PROGRAM_ID` | No | Hot Crown program ID (defaults to mainnet) |
| `KING_POST_INTERVAL_HOURS` | No | Hours between throne status posts (default: 24) |

## Architecture

```
src/
  index.ts        — Entry point, WebSocket subscription, event routing, scheduled posts
  config.ts       — Environment variable loading and validation
  game-state.ts   — Solana connection, Anchor program setup, game state fetching
  telegram.ts     — Telegram API integration (messages + inline keyboard)
  messages.ts     — Message formatting for all event types
  punchlines.ts   — Randomized humor lines per event category
  idl/            — Anchor IDL for the Hot Crown program
```

The bot subscribes to on-chain program logs, detects game instructions, fetches the updated game state, formats a message, and sends it to Telegram. A health check runs every 30 seconds and reconnects automatically if the WebSocket drops.
