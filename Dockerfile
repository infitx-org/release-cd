ARG NODE_VERSION=24.11.0-alpine

FROM node:${NODE_VERSION} AS builder

WORKDIR /opt/app
COPY package*.json ./
COPY index.js ./

RUN npm ci

CMD [ "node" , "index.mjs" ]
