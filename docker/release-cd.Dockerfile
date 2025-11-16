ARG NODE_VERSION_BUILD=24.11.0
ARG NODE_VERSION=24.11.0-slim

# Base image with system tools
FROM node:${NODE_VERSION} AS system
RUN apt-get update && \
    apt-get install -y curl gnupg2 ca-certificates git squid mc jq openssh-server && \
    # Install yq
    curl -LO https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 && \
    install -m 0755 yq_linux_amd64 /usr/local/bin/yq && \
    rm yq_linux_amd64 && \
    # Install kubectl
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    install -m 0755 kubectl /usr/local/bin/kubectl && \
    rm kubectl && \
    # Install Helm
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash && \
    # Install k9s
    curl -LO https://github.com/derailed/k9s/releases/latest/download/k9s_Linux_amd64.tar.gz && \
    tar -xzf k9s_Linux_amd64.tar.gz -C /usr/local/bin k9s && \
    rm k9s_Linux_amd64.tar.gz && \
    # Install ArgoCD CLI
    curl -LO https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64 && \
    install -m 0755 argocd-linux-amd64 /usr/local/bin/argocd && \
    rm argocd-linux-amd64 && \
    # Install latest ttyd
    curl -LO https://github.com/tsl0922/ttyd/releases/latest/download/ttyd.x86_64 && \
    install -m 0755 ttyd.x86_64 /usr/local/bin/ttyd && \
    rm ttyd.x86_64 && \
    # Clean up
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Verify installations
RUN kubectl version --client && \
    helm version && \
    k9s version && \
    squid -v && \
    git --version && \
    jq --version && \
    yq --version && \
    argocd version --client

# Build application dependencies
FROM node:${NODE_VERSION_BUILD} AS builder
WORKDIR /opt/app
COPY package*.json ./
RUN npm ci

# Final release image
FROM system AS release
WORKDIR /opt/app
COPY --chown=node --from=builder /opt/app .
COPY --chown=node *.*js *.feature *.sh ./

USER node
EXPOSE 80
ENTRYPOINT [ "bash", "-c" ]
CMD [ "sleep infinity" ]
