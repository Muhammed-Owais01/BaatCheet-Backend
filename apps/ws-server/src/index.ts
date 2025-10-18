import http from "http";
import express from "express";
import SocketService from "./services/socket.js";
import { ensureTopics, startDLQConsumer, startMessageConsumer } from "./services/kafka.js";

async function init() {
  await ensureTopics();
  await startMessageConsumer();
  startDLQConsumer();

  const app = express();
  app.use(express.json());

  const socketService = new SocketService();
  const httpServer = http.createServer(app);
  const PORT = process.env.PORT ? process.env.PORT : 8000;

  // HTTP endpoint for sending messages
  app.post('/api/messages', async (req, res) => {
    try {
      const { chatId, senderId, message } = req.body;
      
      // Use the same Redis publisher as socket service
      await socketService.publishMessage(chatId, senderId, message);
      
      res.status(200).json({ success: true, message: 'Message sent successfully' });
    } catch (error: any) {
      console.error('Error sending message:', error);
      if (error.message === "User is not a member of this chat") {
        return res.status(403).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Failed to send message' });
    }
  });

  socketService.io.attach(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`HTTP Server started at PORT ${PORT}`);
  });

  socketService.initListeners();
}

init();