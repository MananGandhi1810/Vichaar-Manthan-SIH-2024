# Automated Interview Platform

A automated online interview platform for the recruitment process.

## Stack

-   [Node.js](https://nodejs.org/)
-   [Express](https://expressjs.com/)
-   [MongoDB](https://www.mongodb.com/)
-   [Docker](https://www.docker.com/)
-   [Docker Compose](https://docs.docker.com/compose/)
-   [Apache Kafka](https://kafka.apache.org/)
-   [Next.js](https://nextjs.org/)
-   [Python](https://www.python.org/)
-   [Gemini API](https://ai.google.dev/)

## Architecture

![Architecture](./assets/architecture.png)

## How to run

```console
git clone https://github.com/MananGandhi1810/Vichaar-Manthan-SIH-2024
cd Vichaar-Manthan-SIH-2024
```

Set up MongoDB password:

```console
nano docker-compose.yml
```

Configure environment variables:

```console
cp .env.example .env
nano .env
```

Start the application:

```console
docker compose up -d
```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.