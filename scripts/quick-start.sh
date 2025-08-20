#!/bin/bash

# CCF Sermon Planning System - Quick Start Script
# This script sets up the entire application stack

set -e

echo "🚀 CCF Sermon Planning System - Quick Start"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

if ! command_exists psql; then
    print_warning "PostgreSQL is not installed. You'll need it for the database."
fi

if ! command_exists redis-cli; then
    print_warning "Redis is not installed. You'll need it for caching and real-time features."
fi

print_success "Prerequisites check completed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."

# Root dependencies
if [ -f "package.json" ]; then
    npm install
    print_success "Root dependencies installed"
fi

# Backend dependencies
if [ -d "src/backend" ]; then
    cd src/backend
    npm install
    print_success "Backend dependencies installed"
    cd ../..
fi

# Frontend dependencies
if [ -d "src/frontend" ]; then
    cd src/frontend
    npm install
    
    # Install shadcn/ui components
    echo "🎨 Installing shadcn/ui components..."
    npx shadcn-ui@latest add button card dialog dropdown-menu input label select separator sheet table tabs textarea toast avatar badge scroll-area tooltip command popover form -y 2>/dev/null || true
    
    print_success "Frontend dependencies installed"
    cd ../..
fi

echo ""

# Check for environment files
echo "🔧 Checking environment configuration..."

if [ ! -f "src/backend/.env" ]; then
    print_warning "Backend .env file not found. Creating template..."
    cat > src/backend/.env << 'EOF'
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/ccf_planner
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ccf_planner
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Firebase Admin SDK (replace with your values)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# JWT Secrets
JWT_ACCESS_SECRET=your-super-secret-access-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# Server
PORT=3001
NODE_ENV=development
EOF
    print_warning "Please update src/backend/.env with your actual values"
fi

if [ ! -f "src/frontend/.env" ]; then
    print_warning "Frontend .env file not found. Creating template..."
    cat > src/frontend/.env << 'EOF'
# API Configuration
VITE_API_URL=http://localhost:3001/api/v1
VITE_WS_URL=ws://localhost:3001

# Firebase Client SDK (replace with your values)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
EOF
    print_warning "Please update src/frontend/.env with your actual Firebase values"
fi

print_success "Environment files checked"
echo ""

# Database setup
echo "🗄️  Setting up database..."

if command_exists psql; then
    read -p "Do you want to create the database now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Create database
        createdb ccf_planner 2>/dev/null || print_warning "Database might already exist"
        
        # Run migrations
        cd src/backend
        npm run migrate 2>/dev/null || print_warning "Migrations might have already run"
        
        # Seed database (optional)
        read -p "Do you want to seed the database with sample data? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm run seed 2>/dev/null || print_warning "Seeding might have failed"
        fi
        
        cd ../..
        print_success "Database setup completed"
    fi
else
    print_warning "PostgreSQL not found. Please install PostgreSQL and run migrations manually."
fi

echo ""

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p src/backend/logs
mkdir -p src/backend/uploads
mkdir -p src/frontend/public/assets
print_success "Directories created"
echo ""

# Final instructions
echo "=========================================="
print_success "Setup completed successfully!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Update environment files with your actual values:"
echo "   - src/backend/.env"
echo "   - src/frontend/.env"
echo ""
echo "2. Start the development servers:"
echo "   ${GREEN}npm run dev${NC} (from project root)"
echo ""
echo "   Or start individually:"
echo "   ${GREEN}cd src/backend && npm run dev${NC}"
echo "   ${GREEN}cd src/frontend && npm run dev${NC}"
echo ""
echo "3. Access the application:"
echo "   Frontend: ${GREEN}http://localhost:5173${NC}"
echo "   Backend API: ${GREEN}http://localhost:3001${NC}"
echo ""
echo "4. Set up Firebase:"
echo "   - Enable Gmail authentication in Firebase Console"
echo "   - Download service account key for backend"
echo "   - Add web app configuration for frontend"
echo ""
echo "📚 Documentation: docs/SETUP_GUIDE.md"
echo "🎨 UI Components: docs/shadcn-implementation.md"
echo ""
print_success "Happy coding! 🎉"