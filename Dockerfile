FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --only=production

COPY . .

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "server.js"]
