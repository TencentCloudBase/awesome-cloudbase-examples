FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "start", "--", "-p", "8080"]
