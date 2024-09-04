import { Kafka } from "kafkajs";
import dotenv from "dotenv";

dotenv.config();
var isConnected = false;

try {
    const kafka = new Kafka({
        clientId: "express-backend",
        brokers: [process.env.KAFKA_BROKER ?? "localhost:9092"],
    });

    const producer = kafka.producer();
    await producer.connect();
    isConnected = true;
} catch (e) {
    console.log("Couldn't connect to Kafka Broker as a producer");
    console.log(e);
}
const sendQueueMessage = async (topic, message) => {
    if (!isConnected) {
        console.log("Couldn't send message to kafka broker");
        return;
    }
    try {
        await producer.send({
            topic,
            messages: [{ value: message }],
        });
    } catch (e) {
        console.log("Couldn't send message to kafka broker");
        console.log(e);
    }
};

export { sendQueueMessage };
