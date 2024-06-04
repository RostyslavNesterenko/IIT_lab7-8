FROM node:22-alpine

WORKDIR /home/node/myapp

COPY --chown=node package*.json ./

RUN npm install

COPY --chown=node . .

CMD ["npm", "start"]