import type { VercelRequest, VercelResponse } from '@vercel/node';

import { createApp } from '../src/app.js';
import { initDatabase } from '../src/db/client.js';

const app = createApp();

let dbInitialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }

  return new Promise<void>((resolve) => {
    app(req as any, res as any, () => {
      resolve();
    });
  });
}
