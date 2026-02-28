import { env } from './config/env.js';
import { initDatabase } from './db/client.js';
import { createApp } from './app.js';

initDatabase();
const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

function shutdown(signal: string): void {
  console.log(`Received ${signal}. Closing resources...`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
