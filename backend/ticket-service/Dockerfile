FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY services ./services

ENV NODE_ENV=production
EXPOSE 3002

CMD ["node", "server.js"]
