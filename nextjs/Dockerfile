FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent && npm cache clean --force
COPY . .
RUN npm run build
 
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
ENV NODE_ENV=production
EXPOSE 80
CMD ["node", "server.js"]