#!/bin/bash

# AppFlowy Cloud Integration Script for CCF-planner
# This script manages the AppFlowy Cloud deployment on port 6780

set -e

APPFLOWY_DIR="$HOME/Documents/Github/AppFlowy-Cloud"
CCF_DIR="$(pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check if AppFlowy-Cloud directory exists
check_appflowy() {
    if [ ! -d "$APPFLOWY_DIR" ]; then
        print_message "$RED" "❌ AppFlowy-Cloud directory not found!"
        print_message "$YELLOW" "📥 Cloning AppFlowy-Cloud..."
        cd "$(dirname "$APPFLOWY_DIR")"
        git clone https://github.com/AppFlowy-IO/AppFlowy-Cloud.git
        cd "$APPFLOWY_DIR"
        cp deploy.env .env
        # Configure for port 6780
        sed -i '' 's/NGINX_PORT=80/NGINX_PORT=6780/' .env
        sed -i '' 's/NGINX_TLS_PORT=443/NGINX_TLS_PORT=6443/' .env
        sed -i '' 's/FQDN=localhost/FQDN=localhost:6780/' .env
    fi
}

# Start AppFlowy services
start_appflowy() {
    print_message "$GREEN" "🚀 Starting AppFlowy Cloud services on port 6780..."
    cd "$APPFLOWY_DIR"
    docker compose up -d
    
    # Wait for services to be healthy
    print_message "$YELLOW" "⏳ Waiting for services to be healthy..."
    sleep 10
    
    # Check status
    docker compose ps
    
    print_message "$GREEN" "✅ AppFlowy Cloud is running!"
    print_message "$GREEN" "📍 Admin Console: http://localhost:6780/console"
    print_message "$GREEN" "📍 API Endpoint: http://localhost:6780"
    print_message "$YELLOW" "🔑 Default credentials: admin@example.com / password"
}

# Stop AppFlowy services
stop_appflowy() {
    print_message "$YELLOW" "🛑 Stopping AppFlowy Cloud services..."
    cd "$APPFLOWY_DIR"
    docker compose down
    print_message "$GREEN" "✅ AppFlowy Cloud stopped"
}

# Check AppFlowy status
status_appflowy() {
    print_message "$GREEN" "📊 AppFlowy Cloud Status:"
    cd "$APPFLOWY_DIR"
    docker compose ps
}

# Reset AppFlowy (remove all data)
reset_appflowy() {
    print_message "$RED" "⚠️  Warning: This will delete all AppFlowy data!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "$APPFLOWY_DIR"
        docker compose down -v
        print_message "$GREEN" "✅ AppFlowy Cloud data has been reset"
    else
        print_message "$YELLOW" "❌ Reset cancelled"
    fi
}

# Show logs
logs_appflowy() {
    cd "$APPFLOWY_DIR"
    docker compose logs -f
}

# Health check
health_check() {
    print_message "$GREEN" "🏥 Performing health check..."
    
    # Check if services are running
    if docker compose ps | grep -q "Up"; then
        print_message "$GREEN" "✅ Docker services are running"
    else
        print_message "$RED" "❌ Some services are not running"
    fi
    
    # Check admin console
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:6780/console | grep -q "200\|302"; then
        print_message "$GREEN" "✅ Admin console is accessible"
    else
        print_message "$RED" "❌ Admin console is not accessible"
    fi
    
    # Check API endpoint
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:6780/api/health 2>/dev/null | grep -q "200\|404"; then
        print_message "$GREEN" "✅ API endpoint is responding"
    else
        print_message "$RED" "❌ API endpoint is not responding"
    fi
}

# Main command handler
case "$1" in
    start)
        check_appflowy
        start_appflowy
        ;;
    stop)
        stop_appflowy
        ;;
    restart)
        stop_appflowy
        start_appflowy
        ;;
    status)
        status_appflowy
        ;;
    logs)
        logs_appflowy
        ;;
    reset)
        reset_appflowy
        ;;
    health)
        health_check
        ;;
    *)
        print_message "$YELLOW" "Usage: $0 {start|stop|restart|status|logs|reset|health}"
        echo ""
        echo "Commands:"
        echo "  start    - Start AppFlowy Cloud services"
        echo "  stop     - Stop AppFlowy Cloud services"
        echo "  restart  - Restart AppFlowy Cloud services"
        echo "  status   - Show service status"
        echo "  logs     - Show service logs"
        echo "  reset    - Reset all data (dangerous!)"
        echo "  health   - Perform health check"
        exit 1
        ;;
esac