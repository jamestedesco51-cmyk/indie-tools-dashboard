# Outreach OS — indie.io

Internal tool for managing inbound game developer submissions and outbound community signals.

## What it does

**Inbound** — Polls Gmail for Wix form submissions from indie developers. Parses each email, extracts structured fields (game, studio, wishlist count, pitch deck, funding ask), and surfaces them in a queue with auto-generated reply drafts.

**Outbound** — Monitors Discord servers, Reddit subreddits, and RSS feeds for signals matching publisher-seeking keywords. Drafts public replies and DMs for each hit.

**Dashboard** — React frontend with five views: Overview, Inbound Queue, Outbound Signals, Templates, Settings.

## Stack

- Node.js + Express
- SQLite via `better-sqlite3`
- React + Vite
- Gmail API (`googleapis`), Discord.js v14, Snoowrap (Reddit), rss-parser

## Setup

```bash
npm install
cd frontend && npm install && cd ..
cp .env.example .env
# Fill in credentials (see below)
npm run dev:all
```

Open `http://localhost:5173`

## Environment variables

```
# Gmail
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
GMAIL_USER=
WIX_SENDER_ADDRESS=no-reply@crm.wix.com

# Discord
DISCORD_BOT_TOKEN=
DISCORD_CHANNEL_IDS=

# Reddit
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USERNAME=
REDDIT_PASSWORD=

# App
REP_NAME=James
CREDIT_LINK_URL=https://indie.io/credit
PORT=3001
DB_PATH=./db/outreach.sqlite
```

## Project structure

```
agents/       Gmail, Discord, Reddit, RSS crawlers
lib/          DB helpers, Wix email parser, template engine, keyword matcher
server/       Express app + routes (inbound, signals, templates, settings)
frontend/     React + Vite dashboard
db/           SQLite schema + database file
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev:all` | Start server + frontend together |
| `npm run dev` | Server only (with nodemon) |
| `npm run client` | Frontend only |
| `npm test` | Run parser unit tests |
