FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent && npm cache clean --force

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
ENV KAFKAJS_NO_PARTITIONER_WARNING=1
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]