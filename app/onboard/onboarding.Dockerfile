ARG NODE_VERSION_BUILD=24.11.0
ARG NODE_VERSION=24.11.0-slim


# Build application dependencies
FROM node:${NODE_VERSION_BUILD} AS builder
WORKDIR /opt/app
COPY --parents rush.json common app/**/package.json library/**/package.json ./
RUN node common/scripts/install-run-rush.js install && \
    node common/scripts/install-run-rush.js rebuild --verbose
COPY --parents app/**/* library/**/* ./
RUN node common/scripts/install-run-rush.js deploy

# Final release image
FROM node:${NODE_VERSION_BUILD} as release
COPY --chown=node --from=builder --exclude=**/.rush --exclude=**/docker/ --exclude=**/rush-logs /opt/app/common/deploy /opt
WORKDIR /opt/app/onboard
USER node

EXPOSE 8080
CMD [ "node" , "index.js" ]
