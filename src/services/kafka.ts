import { Kafka, type Consumer, type Producer } from "kafkajs";
import prismaClient from "./prisma.js";

export const MESSAGES_TOPIC = "MESSAGES";
export const DLQ_TOPIC = "MESSAGES_DLQ";

process.env.KAFKAJS_NO_PARTITIONER_WARNING = "1";

const kafka = new Kafka({
  clientId: "bc-service",
  brokers: [process.env.KAFKA_BROKER_URL!]
});

const admin = kafka.admin();

export async function ensureTopics() {
  await admin.connect();

  await admin.createTopics({
    waitForLeaders: true,
    topics: [
      {
        topic: MESSAGES_TOPIC,
        numPartitions: 1,
        replicationFactor: 1,
        configEntries: [
          { name: "retention.ms", value: (7 * 24 * 60 * 60 * 1000).toString() },
          { name: "cleanup.policy", value: "delete" },
        ],
      },
      {
        topic: DLQ_TOPIC,
        numPartitions: 1,
        replicationFactor: 1,
        configEntries: [
          { name: "retention.ms", value: (30 * 24 * 60 * 60 * 1000).toString() },
          { name: "cleanup.policy", value: "delete" },
        ],
      },
    ],
  });

  await admin.disconnect();
}

let producer: Producer | null = null;

export async function createProducer(): Promise<Producer> {
  if (producer)
    return producer;

  process.on("SIGINT", async () => {
    if (producer)
      await producer.disconnect();
    process.exit(0);
  });

  producer = kafka.producer();
  await producer.connect();
  return producer;
}

export async function produceMessage(
  topic: string,
  key: string | null,
  value: string,
  retryTimeout: number = 10 * 1000
): Promise<void> {
  try {
    const producer = await createProducer();

    await producer.send({
      topic,
      messages: key ? [{ key, value }] : [{ value }]
    });
  } catch (error) {
    if (topic === DLQ_TOPIC) {
      console.error("Failed to produce message to DLQ, dropping message:", error);
      return;
    }

    console.error(`Failed to produce message to ${topic}:`, error);
    setTimeout(async () => {
      await produceMessage(DLQ_TOPIC, key, value, 2*retryTimeout);
    }, retryTimeout);
  }
}

export async function startMessageConsumer() {
  console.log("Consumer is running...");
  const consumer = kafka.consumer({
    groupId: "bc-group"
  });

  await consumer.connect();
  await consumer.subscribe({ topic: MESSAGES_TOPIC, fromBeginning: true });

  await consumer.run({
    autoCommit: true,
    eachBatch: async ({ batch, resolveOffset, heartbeat, pause }) => {
      for (const message of batch.messages) {
        if (!message.value) {
          resolveOffset(message.offset);
          continue;
        }

        try {
          const content = message.value.toString();

          await prismaClient.message.create({
            data: { content },
          });
          
          console.log(
            `Stored message (offset: ${message.offset}, partition: ${batch.partition}): ${content}`
          );

          resolveOffset(message.offset);
          await heartbeat();
        } catch (error) {
          console.error("Error storing message:", error);

          await produceMessage(
            DLQ_TOPIC,
            message.key?.toString() ?? null,
            JSON.stringify({
              originalValue: message.value.toString(),
              error: (error as Error).message,
              partition: batch.partition,
              offset: message.offset,
            })
          );

          pause();
          setTimeout(() => {
            consumer?.resume([{ topic: MESSAGES_TOPIC }]);
          }, 10 * 1000);
        }
      }
    }
  })

  process.on("SIGINT", async () => {
    if (consumer)
      await consumer.disconnect();
    process.exit(0);
  });
}

export async function startDLQConsumer(): Promise<void> {
  console.log("DLQConsumer is running...");
  const dlqConsumer = kafka.consumer({ groupId: "dlq-group" });

  await dlqConsumer.connect();
  await dlqConsumer.subscribe({ topic: DLQ_TOPIC, fromBeginning: true });

  await dlqConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (!message.value) return;

      const raw = message.value.toString();
      const parsed = JSON.parse(raw);

      console.log(
        `DLQ message (partition ${partition}, offset ${message.offset}):`,
        parsed
      );
    },
  });

  process.on("SIGINT", async () => {
    if (dlqConsumer)
      await dlqConsumer.disconnect();
    process.exit(0);
  });
}

export default kafka;
