import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initWebSocket, telemetryState } from './services/broadcaster.js';
import webhookRouter from './routes/webhook.js';

const app = express();
app.use(cors());
app.use(express.json());

// Mount webhook router
app.use('/webhook', webhookRouter);

// ✅ Clean, reliable REST API endpoint pulling straight from the broadcaster memory store
app.get('/api/telemetry-state', (req, res) => {
  res.status(200).json(telemetryState);
});

const server = createServer(app);
initWebSocket(server);

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CodePulse Backend Active on Port ${PORT}`);
});