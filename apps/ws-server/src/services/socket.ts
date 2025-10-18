import { Server } from "socket.io"
import { Redis } from "ioredis";
import { MESSAGES_TOPIC, produceMessage } from "./kafka.js";
import { validateChatMembership } from "@baatcheet/common";

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

  public async publishMessage(chatId: string, senderId: string, message: string) {
    // Validate membership before publishing
    await validateChatMembership(senderId, chatId);
    await pub.publish(MESSAGES_CHANNEL, JSON.stringify({ chatId, senderId, message }));
  }

  public initListeners() {
    const io = this.io;
    console.log("Init Socket Listeners...");

    io.on("connect", (socket) => {
      console.log(`New Socket Connect`, socket.id);

      // TODO: Re-enable "event:message" handler when chat message events are supported.
    });

    sub.on("message", async (channel, data) => {
      if (channel === MESSAGES_CHANNEL) {
        io.emit("message", data);
        const { chatId, senderId, message } = JSON.parse(data);
        await produceMessage(MESSAGES_TOPIC, chatId, JSON.stringify({ senderId, message }));
      }
    });
  }

  get io() {
    return this._io;
  }
}

export default SocketService;