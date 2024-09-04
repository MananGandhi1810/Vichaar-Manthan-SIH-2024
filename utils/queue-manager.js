import { Kafka } from "kafkajs";
import dotenv from "dotenv";

dotenv.config();

const kafka = new Kafka({
    clientId: "express-backend",
    brokers: [process.env.KAFKA_BROKER ?? "localhost:9092"],
});

const producer = kafka.producer();
await producer.connect();

const sendQueueMessage = async (topic, message) => {
    await producer.send({
        topic,
        messages: [{ value: message }],
    });
};

export { sendQueueMessage };
