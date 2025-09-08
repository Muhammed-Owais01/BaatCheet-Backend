import http from "http";
import SocketService from "./services/socket.js";
import { ensureTopics, startDLQConsumer, startMessageConsumer } from "./services/kafka.js";

async function init() {
  await ensureTopics();
  await startMessageConsumer();
  startDLQConsumer();

  const socketService = new SocketService();

  const httpServer = http.createServer()
  const PORT = process.env.PORT ? process.env.PORT : 8000;

  socketService.io.attach(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`HTTP Server started at PORT ${PORT}`);
  });

  socketService.initListeners();
}

init();