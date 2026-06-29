# Development Guide

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose (for containerized development)
- Git

## Project Structure

```
jagger-swap/
├── frontend/          # Next.js React application
│   ├── src/
│   │   ├── app/      # Next.js app router pages
│   │   ├── components/  # React components
│   │   ├── hooks/    # Custom React hooks
│   │   ├── lib/      # Utilities and API client
│   │   ├── styles/   # Global styles
│   │   └── types/    # TypeScript type definitions
│   └── ...
├── backend/           # FastAPI Python application
│   ├── app/
│   │   ├── api/      # API endpoints
│   │   ├── core/     # Core configuration
│   │   ├── schemas/  # Pydantic models
│   │   └── services/ # Business logic services
│   └── ...
├── configs/           # Configuration files
├── docs/              # Documentation
└── scripts/           # Utility scripts
```

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend API will be available at `http://localhost:8000`.

API documentation will be at `http://localhost:8000/docs`.

### Using Docker Compose

```bash
# Build and start all services
docker-compose up

# Build in background
docker-compose up -d

# Stop all services
docker-compose down
```

## Code Style

### Frontend

- TypeScript strict mode is enabled
- Use ESLint for linting: `npm run lint`
- Use Prettier for formatting: `npm run format`
- Type checking: `npm run type-check`

### Backend

- Follow PEP 8 guidelines
- Use Black for formatting: `black app/`
- Use Flake8 for linting: `flake8 app/`
- Type hints are required for all function signatures

## API Endpoints

### Upload
- `POST /upload` - Upload an image file
- `GET /upload/{file_id}` - Get file information
- `DELETE /upload/{file_id}` - Delete a file

### Camera
- `POST /camera/start` - Start camera stream
- `POST /camera/stop` - Stop camera stream
- `GET /camera/devices` - List available cameras
- `GET /camera/status` - Get camera status

### Animation
- `POST /animation/start` - Start animation processing
- `GET /animation/status` - Get animation status
- `POST /animation/stop` - Stop animation
- `GET /animation/settings` - Get animation settings
- `POST /animation/settings` - Update animation settings

### Status
- `GET /status/` - Get API status
- `GET /status/health` - Health check
- `GET /status/info` - Get detailed API info

## Testing

### Frontend Tests
Tests are to be implemented. Run them with:
```bash
npm test
```

### Backend Tests
Tests are to be implemented. Run them with:
```bash
pytest
```

## Environment Variables

### Frontend (.env)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```
APP_NAME=JAGGER SWAP
APP_VERSION=1.0.0
DEBUG=false
API_PREFIX=/api/v1
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
DEFAULT_RESOLUTION=1280x720
TARGET_FPS=30
ANIMATION_ENABLED=false
```

## Adding New Features

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run linting and tests
4. Commit with clear messages
5. Push and create a pull request

## Troubleshooting

### Camera not working?
- Ensure browser has camera permissions
- Check if another application is using the camera
- Try refreshing the page

### Upload fails?
- Check file size (max 10MB)
- Verify file format (PNG, JPEG, JPG only)
- Check backend is running

### Docker issues?
- Ensure Docker daemon is running
- Try: `docker-compose down && docker-compose up --build`
- Check logs: `docker-compose logs`
