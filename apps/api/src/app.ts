import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { healthRouter } from './routes/health.route.js';
import { jobRouter } from './routes/jobs.route.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.WEB_ORIGIN,
    }),
  );
  app.use(express.json({ limit: '2mb' }));

  app.use('/api', healthRouter);
  app.use('/api', jobRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({
      error: 'Internal server error',
    });
  });

  return app;
}
