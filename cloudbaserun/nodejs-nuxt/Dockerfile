FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 8080
ENV HOST=0.0.0.0 PORT=8080
CMD ["npm", "start"]
