#!/bin/bash
# Production Deployment Script for Compute Engine
# This script rebuilds Docker images and restarts services with the latest code

set -e  # Exit on any error

echo "🚀 Starting production deployment..."

# 1. Stop all running containers
echo "⏹️  Stopping containers..."
sudo docker compose down

# 2. Pull latest code (if not already done)
echo "📥 Pulling latest changes..."
git pull origin master || true

# 3. Remove old images to force rebuild
echo "🗑️  Removing old images..."
sudo docker-compose rm -f frontend proxy
sudo docker image prune -f

# 4. Rebuild images without cache
echo "🔨 Building new images..."
sudo docker-compose build --no-cache frontend proxy

# 5. Start services
echo "▶️  Starting services..."
sudo docker-compose up -d

# 6. Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# 7. Show running containers
echo "✅ Deployment complete! Running containers:"
sudo docker compose ps

# 8. Show frontend logs to verify
echo ""
echo "📋 Frontend logs (last 20 lines):"
sudo docker compose logs --tail=20 frontend

echo ""
echo "🎉 Deployment finished successfully!"
echo "💡 Check your application at http://$(curl -s ifconfig.me)"
