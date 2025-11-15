ARG NODE_VERSION=24.11.0-alpine

FROM node:${NODE_VERSION} AS builder

WORKDIR /opt/app
COPY package*.json ./
RUN npm ci

COPY *.*js *.feature ./

CMD [ "node" , "index.mjs" ]
