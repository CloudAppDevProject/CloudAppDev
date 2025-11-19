# API Gateway - Development Setup

## Overview

The API Gateway is an Nginx-based reverse proxy that routes requests to the appropriate microservice based on URL path prefixes.

## Architecture

```
Frontend/Client
      ↓
API Gateway (Port 8000)
      ↓
   /api/v1/users       → User Service (8080)
   /api/v1/itineraries → Itinerary Service (8081)
   /api/v1/social      → Social Service (8082)
```

## Usage

### Starting the Gateway

```bash
# Start all services including gateway
docker-compose -f docker-compose.microservices.yml up -d

# Check gateway health
curl http://localhost:8000/health
```

### API Endpoints

All requests go through the gateway:

```bash
# User Service
curl http://localhost:8000/api/v1/users

# Itinerary Service
curl http://localhost:8000/api/v1/itineraries

# Social Service
curl http://localhost:8000/api/v1/social/comments
curl http://localhost:8000/api/v1/social/likes
```

## Configuration

The gateway configuration is in `nginx/gateway.conf`:

- **Request forwarding**: Automatically forwards requests to the correct service
- **Headers**: Preserves original request headers (X-Real-IP, X-Forwarded-For, etc.)
- **File uploads**: Supports up to 50MB uploads
- **Health check**: `/health` endpoint for monitoring

## Frontend Integration

The frontend is configured to use the gateway by default:

**lib/api-config.ts**:
```typescript
const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8000';

export const API_SERVICES = {
  USER_SERVICE: `${API_GATEWAY_URL}/api/v1/users`,
  ITINERARY_SERVICE: `${API_GATEWAY_URL}/api/v1/itineraries`,
  SOCIAL_SERVICE: `${API_GATEWAY_URL}/api/v1/social`,
};
```

## Service Communication

Microservices communicate with each other through the gateway:

```yaml
# Environment variables in docker-compose.microservices.yml
USER_SERVICE_URL: http://api-gateway:80/api/v1/users
ITINERARY_SERVICE_URL: http://api-gateway:80/api/v1/itineraries
SOCIAL_SERVICE_URL: http://api-gateway:80/api/v1/social
```

## Benefits

✅ **Single Entry Point**: All API traffic goes through one port (8000)
✅ **Path-based Routing**: Easy to understand and maintain
✅ **Service Isolation**: Services don't need to know about each other's ports
✅ **Production Ready**: Same pattern works in Kubernetes with Ingress/Gateway
✅ **Load Balancing**: Can easily add load balancing in production
✅ **SSL Termination**: HTTPS can be added at gateway level

## Logs

```bash
# View gateway logs
docker logs cloudappdev_api_gateway -f

# View all service logs
docker-compose -f docker-compose.microservices.yml logs -f
```

## Troubleshooting

### Gateway not responding
```bash
# Check if gateway container is running
docker ps | grep api_gateway

# Restart gateway
docker-compose -f docker-compose.microservices.yml restart api-gateway
```

### Service not reachable through gateway
```bash
# Check if service is running
docker ps | grep user-service

# Test direct service access
curl http://localhost:8080/api/v1/users

# Check gateway config
docker exec cloudappdev_api_gateway cat /etc/nginx/conf.d/gateway.conf
```

## Production Deployment

For Kubernetes/production, replace Nginx gateway with:
- **Kubernetes Ingress** (nginx-ingress, traefik)
- **API Gateway** (Kong, AWS API Gateway, Google Cloud API Gateway)
- **Service Mesh** (Istio, Linkerd)

The path structure (`/api/v1/{service}`) remains the same.
