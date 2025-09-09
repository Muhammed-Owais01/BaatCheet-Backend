import { Server } from "socket.io"
import { Redis } from "ioredis";
import { MESSAGES_TOPIC, produceMessage } from "./kafka.js";

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

  public initListeners() {
    const io = this.io;
    console.log("Init Socket Listeners...");

    io.on("connect", (socket) => {
      console.log(`New Socket Connect`, socket.id);

      socket.on("event:message", async ({ message }: { message: string }) => {
        console.log(`${socket.id}:> ${message}`);
        await pub.publish(MESSAGES_CHANNEL, JSON.stringify({ message }));
      });
    });

    sub.on("message", async (channel, data) => {
      if (channel === MESSAGES_CHANNEL) {
        io.emit("message", data);
        const { message } = JSON.parse(data);
        await produceMessage(MESSAGES_TOPIC, null, message);
      }
    });
  }

  get io() {
    return this._io;
  }
}

export default SocketService;