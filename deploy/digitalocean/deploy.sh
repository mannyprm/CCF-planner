#!/bin/bash

# DigitalOcean Deployment Script for CCF-Planner with AppFlowy
# This script helps deploy the application to DigitalOcean

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check for required tools
check_requirements() {
    print_message "$BLUE" "🔍 Checking requirements..."
    
    local missing_tools=""
    
    if ! command -v docker &> /dev/null; then
        missing_tools="$missing_tools docker"
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        missing_tools="$missing_tools docker-compose"
    fi
    
    if ! command -v doctl &> /dev/null; then
        missing_tools="$missing_tools doctl"
    fi
    
    if [ ! -z "$missing_tools" ]; then
        print_message "$RED" "❌ Missing required tools: $missing_tools"
        print_message "$YELLOW" "Please install missing tools:"
        print_message "$YELLOW" "  - Docker: https://docs.docker.com/get-docker/"
        print_message "$YELLOW" "  - doctl: brew install doctl (macOS) or snap install doctl (Linux)"
        exit 1
    fi
    
    print_message "$GREEN" "✅ All requirements met"
}

# Setup environment
setup_environment() {
    print_message "$BLUE" "📝 Setting up environment..."
    
    if [ ! -f ".env.production" ]; then
        cp .env.production.template .env.production
        print_message "$YELLOW" "⚠️  Created .env.production from template"
        print_message "$YELLOW" "📝 Please edit .env.production with your DigitalOcean settings:"
        print_message "$YELLOW" "   - DO_TEMP_DOMAIN: Your assigned DigitalOcean domain"
        print_message "$YELLOW" "   - Database credentials"
        print_message "$YELLOW" "   - API keys"
        print_message "$YELLOW" "   - Admin passwords"
        echo ""
        read -p "Press Enter after updating .env.production to continue..."
    fi
    
    # Load environment variables
    set -a
    source .env.production
    set +a
    
    print_message "$GREEN" "✅ Environment configured"
}

# Build Docker images
build_images() {
    print_message "$BLUE" "🔨 Building Docker images..."
    
    docker-compose -f docker-compose.production.yml build
    
    print_message "$GREEN" "✅ Images built successfully"
}

# Deploy to DigitalOcean App Platform
deploy_app_platform() {
    print_message "$BLUE" "🚀 Deploying to DigitalOcean App Platform..."
    
    # Check if app spec exists
    if [ ! -f "app.yaml" ]; then
        print_message "$YELLOW" "Creating app.yaml specification..."
        create_app_spec
    fi
    
    # Deploy or update app
    if doctl apps list | grep -q "ccf-planner"; then
        print_message "$YELLOW" "Updating existing app..."
        doctl apps update --spec app.yaml
    else
        print_message "$YELLOW" "Creating new app..."
        doctl apps create --spec app.yaml
    fi
    
    # Get app ID and URL
    APP_ID=$(doctl apps list --format ID --no-header | head -n 1)
    APP_URL=$(doctl apps get $APP_ID --format DefaultIngress --no-header)
    
    print_message "$GREEN" "✅ App deployed successfully"
    print_message "$BLUE" "📍 App URL: https://$APP_URL"
}

# Deploy to DigitalOcean Droplet
deploy_droplet() {
    print_message "$BLUE" "🖥️ Deploying to DigitalOcean Droplet..."
    
    read -p "Enter your droplet IP address: " DROPLET_IP
    read -p "Enter SSH user (default: root): " SSH_USER
    SSH_USER=${SSH_USER:-root}
    
    print_message "$YELLOW" "📦 Copying files to droplet..."
    
    # Create deployment directory on droplet
    ssh $SSH_USER@$DROPLET_IP "mkdir -p /opt/ccf-planner"
    
    # Copy files
    rsync -avz --exclude 'node_modules' --exclude '.git' \
          --exclude 'AppFlowy-Cloud' --exclude 'AppFlowy' \
          ../../ $SSH_USER@$DROPLET_IP:/opt/ccf-planner/
    
    # Copy deployment files
    scp docker-compose.production.yml $SSH_USER@$DROPLET_IP:/opt/ccf-planner/
    scp .env.production $SSH_USER@$DROPLET_IP:/opt/ccf-planner/
    scp -r nginx $SSH_USER@$DROPLET_IP:/opt/ccf-planner/
    
    print_message "$YELLOW" "🚀 Starting services on droplet..."
    
    ssh $SSH_USER@$DROPLET_IP << 'EOF'
        cd /opt/ccf-planner
        docker-compose -f docker-compose.production.yml pull
        docker-compose -f docker-compose.production.yml up -d
        docker-compose -f docker-compose.production.yml ps
EOF
    
    print_message "$GREEN" "✅ Deployment to droplet complete"
    print_message "$BLUE" "📍 Access your app at: http://$DROPLET_IP"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    print_message "$BLUE" "🔒 Setting up SSL certificates..."
    
    read -p "Enter your domain name: " DOMAIN
    read -p "Enter your email for Let's Encrypt: " EMAIL
    
    # Run certbot
    if [ "$1" = "droplet" ]; then
        read -p "Enter droplet IP: " DROPLET_IP
        read -p "Enter SSH user (default: root): " SSH_USER
        SSH_USER=${SSH_USER:-root}
        
        ssh $SSH_USER@$DROPLET_IP << EOF
            cd /opt/ccf-planner
            docker-compose -f docker-compose.production.yml exec nginx certbot certonly \
                --webroot -w /var/www/certbot \
                --email $EMAIL \
                --agree-tos \
                --no-eff-email \
                -d $DOMAIN
            
            # Update nginx config to use SSL
            sed -i 's/# listen 443/listen 443/g' nginx/nginx.prod.conf
            sed -i 's/# ssl_certificate/ssl_certificate/g' nginx/nginx.prod.conf
            docker-compose -f docker-compose.production.yml restart nginx
EOF
    fi
    
    print_message "$GREEN" "✅ SSL certificates configured"
}

# Create app.yaml for App Platform
create_app_spec() {
    cat > app.yaml << 'EOF'
name: ccf-planner
region: nyc
features:
  - buildpack-stack=ubuntu-22

services:
  - name: web
    github:
      repo: your-github-username/CCF-planner
      branch: main
      deploy_on_push: true
    dockerfile_path: deploy/digitalocean/Dockerfile
    instance_count: 1
    instance_size_slug: professional-xs
    http_port: 80
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        value: ${db.DATABASE_URL}
      - key: REDIS_URL
        value: ${redis.REDIS_URL}
    health_check:
      http_path: /health

databases:
  - name: db
    engine: PG
    version: "16"
    size: db-s-1vcpu-1gb
    num_nodes: 1

  - name: redis
    engine: REDIS
    version: "7"
    size: db-s-1vcpu-1gb
    num_nodes: 1

jobs:
  - name: migrate
    kind: PRE_DEPLOY
    github:
      repo: your-github-username/CCF-planner
      branch: main
    dockerfile_path: deploy/digitalocean/Dockerfile.migrate
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: DATABASE_URL
        value: ${db.DATABASE_URL}
EOF
    
    print_message "$YELLOW" "⚠️  Created app.yaml"
    print_message "$YELLOW" "📝 Please update the GitHub repository settings in app.yaml"
}

# Monitor deployment
monitor_deployment() {
    print_message "$BLUE" "📊 Monitoring deployment..."
    
    if [ "$1" = "app-platform" ]; then
        APP_ID=$(doctl apps list --format ID --no-header | head -n 1)
        doctl apps logs $APP_ID --follow
    else
        read -p "Enter droplet IP: " DROPLET_IP
        read -p "Enter SSH user (default: root): " SSH_USER
        SSH_USER=${SSH_USER:-root}
        
        ssh $SSH_USER@$DROPLET_IP "cd /opt/ccf-planner && docker-compose -f docker-compose.production.yml logs -f"
    fi
}

# Health check
health_check() {
    print_message "$BLUE" "🏥 Running health checks..."
    
    read -p "Enter your app URL (with https://): " APP_URL
    
    # Check main app
    if curl -s -o /dev/null -w "%{http_code}" $APP_URL/health | grep -q "200"; then
        print_message "$GREEN" "✅ Main app is healthy"
    else
        print_message "$RED" "❌ Main app is not responding"
    fi
    
    # Check admin console
    if curl -s -o /dev/null -w "%{http_code}" $APP_URL/console | grep -q "200\|302"; then
        print_message "$GREEN" "✅ Admin console is accessible"
    else
        print_message "$RED" "❌ Admin console is not accessible"
    fi
    
    # Check API
    if curl -s -o /dev/null -w "%{http_code}" $APP_URL/api/health | grep -q "200\|404"; then
        print_message "$GREEN" "✅ API is responding"
    else
        print_message "$RED" "❌ API is not responding"
    fi
}

# Main menu
show_menu() {
    echo ""
    print_message "$BLUE" "=========================================="
    print_message "$BLUE" "   CCF-Planner DigitalOcean Deployment   "
    print_message "$BLUE" "=========================================="
    echo ""
    echo "1) Deploy to App Platform (Recommended)"
    echo "2) Deploy to Droplet"
    echo "3) Setup SSL Certificates"
    echo "4) Monitor Deployment"
    echo "5) Health Check"
    echo "6) Build Images Only"
    echo "7) Exit"
    echo ""
    read -p "Select an option: " choice
    
    case $choice in
        1)
            check_requirements
            setup_environment
            build_images
            deploy_app_platform
            ;;
        2)
            check_requirements
            setup_environment
            build_images
            deploy_droplet
            ;;
        3)
            setup_ssl droplet
            ;;
        4)
            echo "Monitor: 1) App Platform  2) Droplet"
            read -p "Select: " monitor_choice
            if [ "$monitor_choice" = "1" ]; then
                monitor_deployment app-platform
            else
                monitor_deployment droplet
            fi
            ;;
        5)
            health_check
            ;;
        6)
            check_requirements
            setup_environment
            build_images
            ;;
        7)
            exit 0
            ;;
        *)
            print_message "$RED" "Invalid option"
            show_menu
            ;;
    esac
}

# Run the script
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  --app-platform    Deploy to DigitalOcean App Platform"
    echo "  --droplet        Deploy to DigitalOcean Droplet"
    echo "  --ssl            Setup SSL certificates"
    echo "  --monitor        Monitor deployment"
    echo "  --health         Run health checks"
    echo "  --help           Show this help message"
    echo ""
    echo "Without options, interactive menu will be shown"
    exit 0
fi

case "$1" in
    --app-platform)
        check_requirements
        setup_environment
        build_images
        deploy_app_platform
        ;;
    --droplet)
        check_requirements
        setup_environment
        build_images
        deploy_droplet
        ;;
    --ssl)
        setup_ssl droplet
        ;;
    --monitor)
        monitor_deployment
        ;;
    --health)
        health_check
        ;;
    *)
        show_menu
        ;;
esac