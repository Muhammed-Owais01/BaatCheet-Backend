import http from 'http';
import env from '@baatcheet/env';
import app from './app.js';

const port = env.REST_SERVER_PORT || "4000";
const server = http.createServer(app);

async function start() {
  try {
    server.listen(port);
    console.log(`http://localhost:${port}`);
  } catch(error: unknown) {
    console.error(error);
  }
}

start();