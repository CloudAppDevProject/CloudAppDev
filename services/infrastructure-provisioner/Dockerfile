# ===================================
# Stage 1: Dependencies
# ===================================
FROM hashicorp/terraform:1.9 AS dependencies

# Install dependencies for API server
RUN apk add --no-cache \
    nodejs \
    npm \
    git \
    curl \
    bash \
    python3 \
    py3-pip

# Install Node.js dependencies
WORKDIR /app
COPY services/infrastructure-provisioner/package*.json ./
RUN npm ci --only=production

# ===================================
# Stage 2: Production
# ===================================
FROM hashicorp/terraform:1.9 AS production

# Install runtime dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    git \
    curl \
    bash \
    kubectl \
    python3 \
    py3-pip

# Install Helm
RUN curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install gcloud CLI
RUN curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz && \
    tar -xf google-cloud-cli-linux-x86_64.tar.gz && \
    ./google-cloud-sdk/install.sh --quiet --path-update=true && \
    rm google-cloud-cli-linux-x86_64.tar.gz && \
    ln -s /app/google-cloud-sdk/bin/gcloud /usr/local/bin/gcloud

WORKDIR /app

# Copy package.json (required for ES modules)
COPY services/infrastructure-provisioner/package*.json ./

# Copy dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application code
COPY services/infrastructure-provisioner/server.js ./server.js

# Copy Terraform configurations to /terraform-src
# Init container will copy these to /terraform volume at startup
COPY terraform /terraform-src

# Copy Kubernetes/Helm charts
COPY k8s /k8s

# Expose API port
EXPOSE 8080

# Override the Terraform ENTRYPOINT from base image
ENTRYPOINT []

# Start the provisioning API
CMD ["node", "server.js"]
