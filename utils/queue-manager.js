import { Kafka } from "kafkajs";

var isConnected = false;

var producer = undefined;

try {
    const kafka = new Kafka({
        clientId: "express-backend",
        brokers: [process.env.KAFKA_BROKER ?? "kafka:9093"],
    });

    producer = kafka.producer();
    await producer.connect();
    isConnected = true;
    console.log("Connected to Kafka Broker as a Producer");
} catch (e) {
    console.log("Couldn't connect to Kafka Broker as a Producer");
    console.log(e);
}

const sendQueueMessage = async (topic, message) => {
    if (!isConnected) {
        console.log("Couldn't send message to Kafka Broker");
        return;
    }
    try {
        await producer.send({
            topic,
            messages: [{ value: message }],
        });
    } catch (e) {
        console.log("Couldn't send message to Kafka Broker");
        console.log(e);
    }
};

export { sendQueueMessage };
