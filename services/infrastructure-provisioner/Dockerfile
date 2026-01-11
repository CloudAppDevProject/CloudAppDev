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
    bash

# Install Node.js dependencies
WORKDIR /app
COPY package*.json ./
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
    bash

WORKDIR /app

# Copy dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application code
COPY . .

# Copy Terraform configurations
COPY terraform /terraform

# Expose API port
EXPOSE 8080

# Start the provisioning API
CMD ["node", "server.js"]
