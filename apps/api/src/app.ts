import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { initDatabase } from './db/client.js';
import { healthRouter } from './routes/health.route.js';
import { jobRouter } from './routes/jobs.route.js';

let dbInitialized = false;

async function ensureDb(): Promise<void> {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
}

const app = express();

const allowedOrigins = env.WEB_ORIGIN.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));

app.use(async (_req, _res, next) => {
  try {
    await ensureDb();
    next();
  } catch (error) {
    next(error);
  }
});

app.use('/api', healthRouter);
app.use('/api', jobRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
  });
});

export default app;
