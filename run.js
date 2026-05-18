import 'dotenv/config';
import { initDb } from './lib/db.js';
import { startServer } from './server/index.js';
import { startGmailAgent } from './agents/gmail-agent.js';
import { startDiscordAgent } from './agents/discord-agent.js';
import { startRedditAgent } from './agents/reddit-agent.js';
import { startRssAgent } from './agents/rss-agent.js';

console.log('indie.io Outreach OS — booting…');

// Init DB (creates tables + seeds defaults)
initDb();
console.log('[db] Schema ready');

// Start API server
startServer();

// Start agents (each handles its own missing-env gracefully)
startGmailAgent();
startDiscordAgent();
startRedditAgent();
startRssAgent();

console.log('indie.io Outreach OS — all agents running');
