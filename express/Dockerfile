FROM node:lts-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --silent && npm cache clean --force

FROM node:lts-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . . 
EXPOSE 3000
USER node
CMD ["sh", "-c", "npm run start"]