import http from "http";
import express from "express";
import cors from 'cors';
import morgan from 'morgan';
import SocketService from "./services/socket.js";
import { ensureTopics, startDLQConsumer, startMessageConsumer } from "./services/kafka.js";
import { fgaClient } from "@baatcheet/auth";

async function init() {
  // Initialize OpenFGA authorization model
  
  await ensureTopics();
  await startMessageConsumer();
  startDLQConsumer();

  const app = express();
  app.use(express.json());
  app.use(morgan('dev'));
  app.use(cors())

  const socketService = new SocketService();
  const httpServer = http.createServer(app);
  const PORT = process.env.PORT ? process.env.PORT : 8000;

  // HTTP endpoint for sending messages
  app.post('/api/messages/:guildId', async (req, res) => {
    try {
      const { guildId } = req.params;
      const { chatId, senderId, message } = req.body;

      const canSendMessage = await fgaClient.check({
        user: `user:${senderId}`,
        relation: 'can_send_messages',
        object: `guild:${guildId}`,
      });
      if (!canSendMessage) {
        return res.status(403).json({ success: false, message: 'User does not have permission to send messages in this guild' });
      }
      
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