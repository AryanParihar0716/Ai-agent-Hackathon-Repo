import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import webhookRouter from './routes/webhook.js';

const app = express();
app.use(cors());
app.use(express.json());

// 💡 THE FIX: Initialize a single, globally mutable source of truth
global.telemetryState = {
  score: 100,
  history: []
};

// Mount routes
app.use('/webhook', webhookRouter);

// ✅ Dynamic state endpoint for your frontend's HTTP polling fallback
app.get('/api/telemetry-state', (req, res) => {
  res.status(200).json(global.telemetryState);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CodePulse Backend Active on Port ${PORT}`);
});
