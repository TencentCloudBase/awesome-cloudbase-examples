# Use Node.js LTS version
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# use tencent npm mirror to speed up the download
RUN npm config set registry https://mirrors.cloud.tencent.com/npm/

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Expose the port the app runs on
EXPOSE 80

# Command to run the application
CMD [ "npm", "start" ] 