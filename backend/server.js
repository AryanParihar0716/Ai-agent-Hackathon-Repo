// ────────────────────────────────────────────────────────────
//  CodePulse Engine — Express + WebSocket Entry Point
//
//  Starts an HTTP server that serves both the Express REST
//  API and the WebSocket broadcast channel on the same port.
// ────────────────────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initWebSocket } from './services/broadcaster.js';
import webhookRouter from './routes/webhook.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────
app.use('/webhook', webhookRouter);

// Health-check endpoint
app.get('/', (_req, res) => {
  res.json({
    engine: 'CodePulse',
    status: 'operational',
    model: 'claude-sonnet-4-20250514',
    uptime: process.uptime(),
  });
});

// ─── HTTP + WebSocket Server ────────────────────────────
const server = createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════════════╗');
  console.log('  ║                                               ║');
  console.log('  ║   🚀  CodePulse Engine is ONLINE              ║');
  console.log(`  ║   🌐  HTTP  → http://localhost:${PORT}            ║`);
  console.log(`  ║   🔌  WS    → ws://localhost:${PORT}              ║`);
  console.log('  ║   🤖  Model → claude-sonnet-4-20250514            ║');
  console.log('  ║                                               ║');
  console.log('  ╚═══════════════════════════════════════════════╝');
  console.log('');
});
