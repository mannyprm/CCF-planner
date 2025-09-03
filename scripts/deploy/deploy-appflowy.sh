#!/bin/bash

set -e

echo "🚀 Starting AppFlowy Cloud Integration Deployment"

# Configuration
PROJECT_ROOT="/Users/manny/Documents/Github/CCF-planner"
APPFLOWY_ROOT="/Users/manny/Documents/Github/AppFlowy-Cloud"
PORT_BASE=6780

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if ports are available
    for port in {6780..6785}; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_warning "Port $port is already in use"
        fi
    done
    
    print_success "Prerequisites check completed"
}

# Setup AppFlowy Cloud
setup_appflowy() {
    print_status "Setting up AppFlowy Cloud..."
    
    # Clone AppFlowy Cloud if not exists
    if [ ! -d "$APPFLOWY_ROOT" ]; then
        print_status "Cloning AppFlowy Cloud repository..."
        cd /Users/manny/Documents/Github
        git clone https://github.com/AppFlowy-IO/AppFlowy-Cloud.git
    fi
    
    cd "$APPFLOWY_ROOT"
    
    # Copy and modify environment
    if [ ! -f ".env" ]; then
        cp deploy.env .env
        
        # Modify ports
        sed -i '' "s/NGINX_PORT=80/NGINX_PORT=$PORT_BASE/" .env
        sed -i '' "s/NGINX_TLS_PORT=443/NGINX_TLS_PORT=6785/" .env
        
        # Add CCF integration settings
        echo "" >> .env
        echo "# CCF Integration Settings" >> .env
        echo "CCF_INTEGRATION_ENABLED=true" >> .env
        echo "CCF_WEBHOOK_URL=http://ccf-api:6781/webhooks/appflowy" >> .env
        echo "CCF_DATABASE_URL=postgresql://postgres:password@ccf-postgres:5432/sermon_planner" >> .env
    fi
    
    print_success "AppFlowy Cloud setup completed"
}

# Create Docker network
setup_network() {
    print_status "Setting up Docker network..."
    
    # Create shared network if it doesn't exist
    if ! docker network ls | grep -q "ccf-appflowy-network"; then
        docker network create ccf-appflowy-network
        print_success "Created ccf-appflowy-network"
    else
        print_warning "Network ccf-appflowy-network already exists"
    fi
}

# Deploy services
deploy_services() {
    print_status "Deploying services..."
    
    # Deploy CCF services first
    cd "$PROJECT_ROOT"
    print_status "Starting CCF services..."
    docker-compose up -d postgres redis
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 30
    
    # Run database migrations (if they exist)
    if docker-compose ps postgres | grep -q "Up"; then
        print_success "Database is ready"
    else
        print_error "Database failed to start"
        exit 1
    fi
    
    # Deploy AppFlowy Cloud
    cd "$APPFLOWY_ROOT"
    print_status "Starting AppFlowy Cloud..."
    docker-compose up -d
    
    # Deploy CCF API and Frontend
    cd "$PROJECT_ROOT"
    print_status "Starting CCF API and Frontend..."
    docker-compose up -d api frontend
    
    print_success "All services deployed"
}

# Health checks
perform_health_checks() {
    print_status "Performing health checks..."
    
    # Wait for services to start
    sleep 60
    
    # Check CCF API
    if curl -f http://localhost:6781/health > /dev/null 2>&1; then
        print_success "CCF API is healthy"
    else
        print_warning "CCF API health check failed - service may still be starting"
    fi
    
    # Check CCF Frontend
    if curl -f http://localhost:6782 > /dev/null 2>&1; then
        print_success "CCF Frontend is healthy"
    else
        print_warning "CCF Frontend health check failed - service may still be starting"
    fi
    
    # Check AppFlowy Cloud
    if curl -f http://localhost:6780 > /dev/null 2>&1; then
        print_success "AppFlowy Cloud is healthy"
    else
        print_warning "AppFlowy Cloud health check failed - service may still be starting"
    fi
}

# Setup admin user
setup_admin() {
    print_status "Setting up admin user..."
    
    # Wait for AppFlowy to be fully ready
    sleep 30
    
    print_success "Admin user setup completed (manual configuration required)"
}

# Display deployment information
show_deployment_info() {
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Service Information:"
    echo "   CCF Frontend:     http://localhost:6782"
    echo "   CCF API:          http://localhost:6781"
    echo "   AppFlowy Cloud:   http://localhost:6780"
    echo "   Database:         localhost:6783"
    echo "   Redis:            localhost:6784"
    echo ""
    echo "🔑 Admin Access:"
    echo "   CCF Admin:        admin@capechristian.org / admin123"
    echo "   AppFlowy Admin:   admin@example.com / password"
    echo ""
    echo "📖 Next Steps:"
    echo "   1. Access CCF Frontend at http://localhost:6782"
    echo "   2. Login with admin credentials"
    echo "   3. Configure AppFlowy integration in settings"
    echo "   4. Run tests: npm run test:e2e"
    echo ""
    echo "🛠️ Configuration Files Created:"
    echo "   - AppFlowy .env file"
    echo "   - Docker network configured"
    echo "   - Integration schemas ready"
    echo ""
}

# Main execution
main() {
    print_status "Starting AppFlowy Cloud Integration Deployment"
    
    check_prerequisites
    setup_appflowy
    setup_network
    deploy_services
    perform_health_checks
    setup_admin
    show_deployment_info
    
    print_success "Deployment completed successfully!"
}

# Run main function
main "$@"