// ────────────────────────────────────────────────────────────
//  WebSocket Broadcaster — real-time score telemetry to the
//  React dashboard. Keeps in-memory state for new connections.
// ────────────────────────────────────────────────────────────

import { WebSocketServer } from 'ws';

let wss = null;
let currentScore = 100;
const history = [];

/**
 * Attach a WebSocket server to an existing HTTP server instance.
 * Called once during startup.
 */
export function initWebSocket(httpServer) {
  wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected — sending INITIALIZE_PANEL');
    ws.send(JSON.stringify({
      type: 'INITIALIZE_PANEL',
      score: currentScore,
      history,
    }));
  });

  console.log('[WS] WebSocket server attached');
}

/**
 * Broadcast a SCORE_TELEMETRY event to every connected client.
 *
 * @param {number} score   — updated health score (0-100)
 * @param {object} prMeta  — { title, repo, defectCount, peakSeverity, categories, action? }
 */
export function broadcastScore(score, prMeta) {
  currentScore = Math.max(0, Math.min(100, score));

  // Only push to history for review events (not remediation-resolved)
  if (prMeta && prMeta.action !== 'REMEDIATION_RESOLVED') {
    history.unshift(prMeta);
  }

  if (!wss) return;

  const payload = JSON.stringify({
    type: 'SCORE_TELEMETRY',
    score: currentScore,
    prMeta,
  });

  for (const client of wss.clients) {
    if (client.readyState === 1) {   // WebSocket.OPEN
      client.send(payload);
    }
  }

  console.log(`[WS] Broadcast SCORE_TELEMETRY → score=${currentScore}`);
}

/**
 * Reset score back to 100 (used after a remediation merge).
 */
export function resetScore() {
  currentScore = 100;
}

/**
 * Read the current score (useful for computing deltas).
 */
export function getScore() {
  return currentScore;
}