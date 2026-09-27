// API entry point. Starts an empty Express server; no routes are defined yet.
import express from 'express';

const host = process.env.API_HOST ?? '0.0.0.0';
const port = Number(process.env.API_PORT ?? 4000);

const app = express();

app.listen(port, host, () => {
  process.stdout.write(`API listening on http://${host}:${port}\n`);
});
