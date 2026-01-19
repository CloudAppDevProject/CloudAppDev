# ===================================
# Stage 1: Base
# ===================================
FROM node:20-alpine AS base
WORKDIR /app
COPY services/provisioning-service/package.json services/provisioning-service/package-lock.json ./

# ===================================
# Stage 2: Build
# ===================================
FROM base AS build
RUN npm ci
COPY services/provisioning-service/ .
RUN npm run build
RUN npm prune --production

# ===================================
# Stage 3: Production with Infrastructure Tools
# ===================================
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Install infrastructure dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    python3 \
    py3-pip \
    openssl \
    ca-certificates

# Install Terraform
ENV TERRAFORM_VERSION=1.9.8
RUN wget https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
    unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip -d /usr/local/bin/ && \
    rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
    terraform --version

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/ && \
    kubectl version --client

# Install Helm
RUN curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash && \
    helm version

# Install gcloud CLI (Alpine-compatible)
# gcloud requires glibc - install compatibility layer and required libs
RUN apk add --no-cache \
    libc6-compat \
    gcompat \
    libstdc++ \
    libgcc \
    && curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz \
    && tar -xf google-cloud-cli-linux-x86_64.tar.gz -C / \
    && /google-cloud-sdk/install.sh --quiet --path-update=false \
    && rm google-cloud-cli-linux-x86_64.tar.gz \
    && ln -sf /google-cloud-sdk/bin/gcloud /usr/local/bin/gcloud \
    && ln -sf /google-cloud-sdk/bin/gsutil /usr/local/bin/gsutil \
    && gcloud --version

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Copy built application
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./

# Copy Terraform configurations to /terraform-src
# The service will copy these to working directory at runtime
COPY --chown=nestjs:nodejs terraform /terraform-src

# Copy Kubernetes/Helm charts
COPY --chown=nestjs:nodejs k8s /k8s

USER nestjs
EXPOSE 8080

# Start the NestJS provisioning service
CMD ["node", "dist/main"]
