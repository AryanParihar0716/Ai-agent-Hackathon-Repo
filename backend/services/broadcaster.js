import { WebSocketServer } from 'ws';

let wss = null;
// Export these variables cleanly so other files can read and mutate them directly
export const telemetryState = {
  score: 100,
  history: []
};

export function initWebSocket(httpServer) {
  wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected — sending INITIALIZE_PANEL');
    ws.send(JSON.stringify({
      type: 'INITIALIZE_PANEL',
      score: telemetryState.score,
      history: telemetryState.history,
    }));
  });

  console.log('[WS] WebSocket server attached');
}

export function broadcastScore(score, prMeta) {
  telemetryState.score = Math.max(0, Math.min(100, score));

  if (prMeta && prMeta.action !== 'REMEDIATION_RESOLVED') {
    // Prevent duplicate entries during redeliveries or sync updates
    const isDuplicate = telemetryState.history.some(
      item => item.title === prMeta.title && item.repo === prMeta.repo
    );
    if (!isDuplicate) {
      telemetryState.history.unshift(prMeta);
    }
  }

  if (!wss) return;

  const payload = JSON.stringify({
    type: 'SCORE_TELEMETRY',
    score: telemetryState.score,
    prMeta,
  });

  for (const client of wss.clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(payload);
    }
  }
  console.log(`[WS] Broadcast SCORE_TELEMETRY → score=${telemetryState.score}`);
}

export function getScore() {
  return telemetryState.score;
}