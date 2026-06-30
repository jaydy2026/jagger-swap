# JAGGER SWAP - Deployment Guide

This guide covers deploying JAGGER SWAP to production environments.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PUBLIC INTERNET                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CDN / LOAD BALANCER                       │
│                    (Cloudflare, AWS ALB, etc.)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│      VERCEL CDN          │     │    GPU BACKEND CLUSTER       │
│    (Frontend Static)     │     │   (RunPod / Vast.ai)        │
│                         │     │                            │
│  - Static assets        │     │  - FastAPI Server           │
│  - API Proxy            │     │  - Session Management      │
│  - Edge Caching         │     │  - Recording Service       │
│                         │     │  - Virtual Camera Output   │
│  jagger-swap.vercel.app │     │                            │
└─────────────────────────┘     │  api.jagger-swap.com        │
                                └─────────────────────────────┘
```

## Frontend Deployment (Vercel)

### 1. Connect Repository

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Navigate to project
cd frontend

# Deploy
vercel
```

### 2. Environment Variables

Create `.env.production`:

```env
NEXT_PUBLIC_API_URL=https://api.jagger-swap.com
NEXT_PUBLIC_WS_URL=wss://api.jagger-swap.com
```

### 3. Vercel Configuration

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "@api-url",
    "NEXT_PUBLIC_WS_URL": "@ws-url"
  }
}
```

## Backend Deployment (GPU Infrastructure)

### Option 1: RunPod

1. Create account at [runpod.io](https://runpod.io)
2. Launch GPU instance:
   - Image: `runpod/pytorch:2.1.0-tensorflow-2.15-cuda12.1`
   - GPU: RTX 4090 or A100
   - Memory: 16GB+
3. Deploy FastAPI container

### Option 2: Vast.ai

1. Create account at [vast.ai](https://vast.ai)
2. Launch instance with GPU
3. SSH and deploy

### Option 3: AWS (EC2 GPU)

1. Launch `p3.2xlarge` or `g4dn.xlarge` instance
2. Install NVIDIA drivers and Docker
3. Deploy using Docker

## Docker Deployment

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose (Production)

```yaml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - SESSION_TIMEOUT=1800
      - MAX_UPLOAD_SIZE=10485760
      - CORS_ORIGINS=https://jagger-swap.vercel.app
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api
    restart: unless-stopped
```

## Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Environment mode | `development` |
| `SESSION_TIMEOUT` | Session timeout (seconds) | `1800` |
| `MAX_UPLOAD_SIZE` | Max upload size (bytes) | `10485760` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `RECORDING_PATH` | Recording storage path | `./recordings` |

### Frontend

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL |

## Nginx Configuration

```nginx
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:8000;
    }

    server {
        listen 80;
        server_name api.jagger-swap.com;

        # Rate limiting
        limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
        limit_req zone=api burst=20;

        location / {
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # Recording uploads
        client_max_body_size 10M;
    }
}
```

## CI/CD Pipeline

### GitHub Actions (Frontend)

```yaml
name: Frontend Deploy

on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: frontend
```

### GitHub Actions (Backend)

```yaml
name: Backend Deploy

on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to RunPod
        run: |
          # Deploy using RunPod API
          curl -X POST https://api.runpod.io/v2/graphql \
            -H "Authorization: Bearer ${{ secrets.RUNPOD_API_KEY }}" \
            -d '{"query": "mutation { deployPod(...) { ... } }"}'
```

## Monitoring

### Health Check Endpoint

```bash
curl https://api.jagger-swap.com/health
```

### Admin Dashboard

Access at: `https://api.jagger-swap.com/api/admin/metrics`

Required: Admin API key in header:
```
Authorization: Bearer <admin-api-key>
```

## Security Checklist

- [ ] HTTPS enabled
- [ ] CORS configured for production origins
- [ ] Rate limiting enabled
- [ ] Input validation in place
- [ ] File upload size limits set
- [ ] Session timeout configured
- [ ] API keys rotated regularly
- [ ] Docker images updated
- [ ] Nginx configured for DDoS protection

## Troubleshooting

### Common Issues

**CORS Errors:**
- Check `CORS_ORIGINS` environment variable
- Ensure frontend URL is whitelisted

**GPU Not Detected:**
- Verify NVIDIA drivers installed
- Check Docker GPU runtime configuration
- Verify `nvidia-container-toolkit` installed

**High Latency:**
- Check network connectivity
- Monitor GPU utilization
- Consider scaling horizontally

**Memory Issues:**
- Reduce concurrent sessions
- Adjust worker count
- Monitor memory usage

## Support

For deployment issues, check:
1. API logs: `docker logs api`
2. Nginx logs: `docker logs nginx`
3. Health endpoint: `/health`
4. Metrics: `/api/admin/metrics`
