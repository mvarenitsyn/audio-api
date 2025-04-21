# Use official Node.js LTS image
FROM node:18-slim

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json .
RUN npm install --production
COPY index.js ./

EXPOSE 3000
CMD ["npm", "start"]