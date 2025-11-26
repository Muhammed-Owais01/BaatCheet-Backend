import { Server } from "socket.io"
import { Redis } from "ioredis";
import { MESSAGES_TOPIC, produceMessage } from "./kafka.js";
import { validateChatMembership } from "@baatcheet/common";
import { prismaClient } from "@baatcheet/db";

const redisOptions = {
  host: "127.0.0.1",
  port: 6379
};

const pub = new Redis(redisOptions);
const sub = new Redis(redisOptions);

const MESSAGES_CHANNEL = "MESSAGES";

class SocketService {
  private _io: Server;

  constructor() {
    console.log("Init Socket Service...");
    this._io = new Server({
      cors: {
        allowedHeaders: ['*'],
        origin: '*'
      }
    });
    sub.subscribe(MESSAGES_CHANNEL);
  }

  public async publishMessage(chatId: string, senderId: string, message: string, date?: Date) {
    // Validate membership before publishing
    await validateChatMembership(senderId, chatId);
    await pub.publish(MESSAGES_CHANNEL, JSON.stringify({ chatId, senderId, message, date }));
  }

  public initListeners() {
    const io = this.io;
    console.log("Init Socket Listeners...");

    io.on("connect", (socket) => {
      console.log(`New Socket Connect`, socket.id);

      // Allow clients to join specific chat rooms
      socket.on("join:chat", async (data: string) => {
        let chat: string | undefined;
        try {
          const { userId, chatId } = JSON.parse(data);
          chat = chatId;
          // Validate that the user is a member of the chat before joining
          await validateChatMembership(userId, chatId);
          socket.join(`chat:${chatId}`);
          console.log(`${socket.id} joined chat:${chat}`);
        } catch (err) {
          console.warn(`Unauthorized join attempt by socket ${socket.id} for chat:${chat}`);
          socket.emit("error", { message: "You are not authorized to join this chat." });
        }
      });

      // Allow clients to leave specific chat rooms
      socket.on("leave:chat", (chatId: string) => {
        socket.leave(`chat:${chatId}`);
        console.log(`${socket.id} left chat:${chatId}`);
      });

      socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });

    sub.on("message", async (channel, data) => {
      if (channel === MESSAGES_CHANNEL) {
        const { chatId, senderId, message, date } = JSON.parse(data);
        const user = await prismaClient.user.findUnique({ where: { userId: senderId } });
        // Emit only to clients in the specific chat room
        io.to(`chat:${chatId}`).emit("message", JSON.stringify({ chatId, senderId, message, createdAt: date, senderUsername: user?.username, senderName: user?.name }));
        await produceMessage(MESSAGES_TOPIC, chatId, JSON.stringify({ senderId, message, createdAt: date }) );
      }
    });
  }

  get io() {
    return this._io;
  }
}

export default SocketService;