#!/bin/bash

# Cape Christian Sermon Planning System - Setup Script
# This script initializes the development environment and sets up all dependencies

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Header
echo "============================================"
echo "Cape Christian Sermon Planning System Setup"
echo "============================================"
echo ""

# Check prerequisites
print_info "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) detected"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed."
    exit 1
fi
print_success "npm $(npm -v) detected"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed. You'll need Docker for deployment."
else
    print_success "Docker detected"
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_warning "Docker Compose is not installed."
else
    print_success "Docker Compose detected"
fi

# Check Git
if ! command -v git &> /dev/null; then
    print_error "Git is not installed."
    exit 1
fi
print_success "Git detected"

echo ""
print_info "Setting up project structure..."

# Create necessary directories
mkdir -p src/{backend,frontend,shared}
mkdir -p src/backend/{src,tests,migrations}
mkdir -p src/frontend/{src,public,tests}
mkdir -p config/{nginx,redis,prometheus,grafana}
mkdir -p scripts/{backup,deploy,migration}
mkdir -p uploads
mkdir -p logs
mkdir -p backups

print_success "Directory structure created"

# Initialize Backend
echo ""
print_info "Initializing backend project..."
cd src/backend

# Create package.json for backend
cat > package.json << 'EOF'
{
  "name": "ccf-sermon-planner-api",
  "version": "1.0.0",
  "description": "Cape Christian Sermon Planning API",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "migrate": "knex migrate:latest",
    "migrate:make": "knex migrate:make",
    "seed": "knex seed:run",
    "typecheck": "tsc --noEmit"
  },
  "keywords": ["sermon", "planning", "api", "church"],
  "author": "Cape Christian Tech Team",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1",
    "joi": "^17.9.2",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.1",
    "firebase-admin": "^11.10.1",
    "pg": "^8.11.2",
    "knex": "^2.5.1",
    "redis": "^4.6.7",
    "ioredis": "^5.3.2",
    "aws-sdk": "^2.1426.0",
    "multer": "^1.4.5-lts.1",
    "multer-s3": "^3.0.1",
    "puppeteer": "^21.0.1",
    "exceljs": "^4.3.0",
    "ical-generator": "^4.1.0",
    "dayjs": "^1.11.9",
    "uuid": "^9.0.0",
    "socket.io": "^4.5.1",
    "bull": "^4.11.3",
    "rate-limiter-flexible": "^2.4.2",
    "winston": "^3.10.0",
    "express-validator": "^7.0.1"
  },
  "devDependencies": {
    "@types/node": "^20.4.5",
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/compression": "^1.7.2",
    "@types/morgan": "^1.9.4",
    "@types/bcryptjs": "^2.4.2",
    "@types/jsonwebtoken": "^9.0.2",
    "@types/multer": "^1.4.7",
    "@types/uuid": "^9.0.2",
    "@types/jest": "^29.5.3",
    "typescript": "^5.1.6",
    "ts-node": "^10.9.1",
    "nodemon": "^3.0.1",
    "jest": "^29.6.2",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "@typescript-eslint/eslint-plugin": "^6.2.0",
    "@typescript-eslint/parser": "^6.2.0",
    "eslint": "^8.45.0",
    "prettier": "^3.0.0"
  }
}
EOF

# Create TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF

# Create Jest config
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
EOF

print_success "Backend project initialized"

# Initialize Frontend
echo ""
print_info "Initializing frontend project..."
cd ../frontend

# Create package.json for frontend
cat > package.json << 'EOF'
{
  "name": "ccf-sermon-planner-ui",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.2",
    "react-query": "^3.39.3",
    "axios": "^1.4.0",
    "firebase": "^10.1.0",
    "react-firebase-hooks": "^5.1.1",
    "@mui/material": "^5.14.1",
    "@mui/icons-material": "^5.14.1",
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "react-beautiful-dnd": "^13.1.1",
    "react-big-calendar": "^1.8.1",
    "react-hook-form": "^7.45.2",
    "yup": "^1.2.0",
    "dayjs": "^1.11.9",
    "socket.io-client": "^4.5.1",
    "react-toastify": "^9.1.3",
    "recharts": "^2.7.2",
    "react-markdown": "^8.0.7",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@types/react-beautiful-dnd": "^13.1.4",
    "@types/react-big-calendar": "^1.6.4",
    "@typescript-eslint/eslint-plugin": "^6.2.0",
    "@typescript-eslint/parser": "^6.2.0",
    "@vitejs/plugin-react": "^4.0.3",
    "eslint": "^8.45.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "prettier": "^3.0.0",
    "typescript": "^5.1.6",
    "vite": "^4.4.7",
    "vitest": "^0.33.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^5.17.0",
    "@testing-library/user-event": "^14.4.3"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "typecheck": "tsc --noEmit"
  }
}
EOF

# Create TypeScript config for frontend
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

# Create Vite config
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
});
EOF

print_success "Frontend project initialized"

# Go back to root
cd ../..

# Create root package.json for workspace
print_info "Creating workspace configuration..."
cat > package.json << 'EOF'
{
  "name": "ccf-sermon-planner",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "src/backend",
    "src/frontend"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd src/backend && npm run dev",
    "dev:frontend": "cd src/frontend && npm run dev",
    "build": "npm run build:backend && npm run build:frontend",
    "build:backend": "cd src/backend && npm run build",
    "build:frontend": "cd src/frontend && npm run build",
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "cd src/backend && npm test",
    "test:frontend": "cd src/frontend && npm test",
    "lint": "npm run lint:backend && npm run lint:frontend",
    "lint:backend": "cd src/backend && npm run lint",
    "lint:frontend": "cd src/frontend && npm run lint",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,md}\"",
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "setup": "npm install && npm run setup:backend && npm run setup:frontend",
    "setup:backend": "cd src/backend && npm install",
    "setup:frontend": "cd src/frontend && npm install"
  },
  "devDependencies": {
    "concurrently": "^8.2.0",
    "prettier": "^3.0.0"
  }
}
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.lcov

# Production
build/
dist/

# Misc
.DS_Store
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
logs/
*.log

# Editor
.vscode/
.idea/
*.swp
*.swo
*~

# OS
Thumbs.db

# Uploads
uploads/
temp/

# Backups
backups/
*.backup
*.sql.gz

# Docker
.docker/

# Cache
.cache/
*.cache

# SSL
certs/
*.pem
*.key
*.crt
EOF

# Create README
cat > README.md << 'EOF'
# Cape Christian Sermon Planning System

A comprehensive sermon planning and management platform built with AppFlowy, React, Node.js, and PostgreSQL.

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/cape-christian/sermon-planner.git
   cd sermon-planner
   ```

2. **Run setup script**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

## 📦 Project Structure

```
.
├── src/
│   ├── backend/        # Node.js API server
│   ├── frontend/       # React application
│   └── shared/         # Shared types and utilities
├── docs/               # Documentation
├── config/             # Configuration files
├── scripts/            # Utility scripts
├── docker-compose.yml  # Docker configuration
└── .env.example        # Environment template
```

## 🛠️ Available Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run docker:up` - Start Docker containers
- `npm run docker:down` - Stop Docker containers

## 📚 Documentation

- [Implementation Plan](docs/implementation-plan.md)
- [API Documentation](docs/api/openapi.yaml)
- [Database Schema](docs/database/schema.sql)
- [Architecture Overview](architecture.md)

## 🔐 Security

- Firebase Authentication with Gmail SSO
- JWT-based API authentication
- Role-based access control
- Encrypted data at rest and in transit

## 🚢 Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### DigitalOcean Deployment
See [Deployment Guide](docs/deployment.md)

## 📄 License

MIT License - Cape Christian Fellowship

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📞 Support

For support, email tech@capechristian.org
EOF

print_success "Workspace configuration created"

# Install dependencies
echo ""
print_info "Installing dependencies (this may take a few minutes)..."

# Check if .env exists
if [ ! -f .env ]; then
    print_warning "Creating .env file from template..."
    cp .env.example .env
    print_warning "Please edit .env file with your configuration values"
fi

# Install root dependencies
npm install

# Install backend dependencies
cd src/backend
npm install
cd ../..

# Install frontend dependencies
cd src/frontend
npm install
cd ../..

print_success "Dependencies installed"

# Clone AppFlowy if requested
echo ""
read -p "Do you want to clone AppFlowy repository? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Cloning AppFlowy..."
    if [ ! -d "appflowy" ]; then
        git clone https://github.com/AppFlowy-IO/AppFlowy.git appflowy
        print_success "AppFlowy cloned"
    else
        print_warning "AppFlowy directory already exists"
    fi
fi

# Final messages
echo ""
echo "============================================"
print_success "Setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Setup Firebase project and add credentials"
echo "3. Configure DigitalOcean Spaces"
echo "4. Run 'npm run dev' to start development"
echo ""
echo "For more information, see README.md"
echo ""
print_info "Happy coding! 🚀"
EOF

chmod +x setup.sh