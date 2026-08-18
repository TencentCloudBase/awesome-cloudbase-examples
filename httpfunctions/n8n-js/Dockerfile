FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm i --production

COPY src ./src

ENV NODE_ENV=production
EXPOSE 9000

CMD ["node", "src/index.js"]
