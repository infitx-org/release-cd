ARG NODE_VERSION=20.18.0-alpine

FROM node:${NODE_VERSION} AS builder

WORKDIR /opt/app
COPY package*.json ./
COPY index.js ./

RUN npm ci

CMD [ "node" , "index.js" ]
