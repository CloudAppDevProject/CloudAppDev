FROM hashicorp/terraform:1.9

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

# Copy application code
COPY . .

# Copy Terraform configurations
COPY terraform /terraform

# Expose API port
EXPOSE 8080

# Start the provisioning API
CMD ["node", "server.js"]
