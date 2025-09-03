#!/bin/bash

# Quick DigitalOcean Deployment Script
# This script helps you deploy CCF-planner with AppFlowy to DigitalOcean

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CCF-Planner DigitalOcean Deployment  ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Check authentication
echo -e "${YELLOW}Step 1: Checking DigitalOcean authentication...${NC}"
if ! doctl account get &>/dev/null; then
    echo -e "${RED}❌ Not authenticated with DigitalOcean${NC}"
    echo ""
    echo -e "${YELLOW}Please authenticate using:${NC}"
    echo -e "${GREEN}doctl auth init${NC}"
    echo ""
    echo "You'll need your DigitalOcean API token from:"
    echo "https://cloud.digitalocean.com/account/api/tokens"
    echo ""
    echo "After authenticating, run this script again."
    exit 1
fi

echo -e "${GREEN}✅ Authenticated successfully${NC}"
ACCOUNT_EMAIL=$(doctl account get --format Email --no-header)
echo -e "${BLUE}   Account: $ACCOUNT_EMAIL${NC}"
echo ""

# Step 2: Create the app
echo -e "${YELLOW}Step 2: Creating DigitalOcean App...${NC}"
echo "   Using configuration from app.yaml"
echo ""

# Check if app already exists
if doctl apps list --format Spec.Name --no-header | grep -q "ccf-planner-appflowy"; then
    echo -e "${YELLOW}⚠️  App 'ccf-planner-appflowy' already exists${NC}"
    read -p "Do you want to update the existing app? (y/n): " UPDATE_APP
    
    if [ "$UPDATE_APP" = "y" ]; then
        APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "ccf-planner-appflowy" | awk '{print $1}')
        echo -e "${YELLOW}Updating app ID: $APP_ID${NC}"
        doctl apps update $APP_ID --spec app.yaml
    else
        echo "Deployment cancelled."
        exit 0
    fi
else
    # Create new app
    APP_OUTPUT=$(doctl apps create --spec app.yaml --format ID,DefaultIngress --no-header 2>&1)
    
    if [ $? -eq 0 ]; then
        APP_ID=$(echo "$APP_OUTPUT" | awk '{print $1}')
        APP_URL=$(echo "$APP_OUTPUT" | awk '{print $2}')
        
        echo -e "${GREEN}✅ App created successfully!${NC}"
        echo -e "${BLUE}   App ID: $APP_ID${NC}"
        echo -e "${BLUE}   Temporary URL: https://$APP_URL${NC}"
    else
        echo -e "${RED}❌ Failed to create app${NC}"
        echo "$APP_OUTPUT"
        exit 1
    fi
fi

# Step 3: Monitor deployment
echo ""
echo -e "${YELLOW}Step 3: Monitoring deployment...${NC}"
echo "   This may take 10-15 minutes for the first deployment"
echo ""

# Get app details
APP_ID=${APP_ID:-$(doctl apps list --format ID,Spec.Name --no-header | grep "ccf-planner-appflowy" | awk '{print $1}')}
APP_URL=$(doctl apps get $APP_ID --format DefaultIngress --no-header)

echo -e "${BLUE}📱 App Details:${NC}"
echo "   ID: $APP_ID"
echo "   URL: https://$APP_URL"
echo ""

# Show deployment progress
echo -e "${YELLOW}Deployment Progress:${NC}"
echo "   Checking deployment status..."

# Function to check deployment status
check_deployment() {
    local STATUS=$(doctl apps get-deployment $APP_ID $(doctl apps list-deployments $APP_ID --format ID --no-header | head -1) --format Progress --no-header 2>/dev/null || echo "0")
    echo "$STATUS"
}

# Monitor deployment
PREV_STATUS=""
while true; do
    DEPLOYMENT_ID=$(doctl apps list-deployments $APP_ID --format ID --no-header | head -1 2>/dev/null)
    
    if [ -z "$DEPLOYMENT_ID" ]; then
        echo "   Waiting for deployment to start..."
        sleep 5
        continue
    fi
    
    STATUS=$(doctl apps get-deployment $APP_ID $DEPLOYMENT_ID --format Phase,Progress --no-header 2>/dev/null || echo "PENDING 0")
    PHASE=$(echo "$STATUS" | awk '{print $1}')
    PROGRESS=$(echo "$STATUS" | awk '{print $2}')
    
    if [ "$STATUS" != "$PREV_STATUS" ]; then
        echo -e "   Phase: ${YELLOW}$PHASE${NC} - Progress: ${YELLOW}${PROGRESS}%${NC}"
        PREV_STATUS="$STATUS"
    fi
    
    if [ "$PHASE" = "ACTIVE" ] || [ "$PHASE" = "SUPERSEDED" ]; then
        break
    elif [ "$PHASE" = "ERROR" ] || [ "$PHASE" = "CANCELED" ]; then
        echo -e "${RED}❌ Deployment failed with status: $PHASE${NC}"
        echo ""
        echo "Check logs with:"
        echo -e "${YELLOW}doctl apps logs $APP_ID${NC}"
        exit 1
    fi
    
    sleep 5
done

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""

# Step 4: Display access information
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}       🎉 Deployment Complete! 🎉       ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Your CCF-Planner with AppFlowy is now live!${NC}"
echo ""
echo -e "${YELLOW}📍 Access URLs:${NC}"
echo -e "   Main App: ${GREEN}https://$APP_URL${NC}"
echo -e "   Admin Console: ${GREEN}https://$APP_URL/console${NC}"
echo ""
echo -e "${YELLOW}📝 Default Credentials:${NC}"
echo "   Email: admin@example.com"
echo "   Password: password"
echo ""
echo -e "${RED}⚠️  IMPORTANT: Change these credentials immediately!${NC}"
echo ""
echo -e "${YELLOW}📊 Useful Commands:${NC}"
echo "   View logs:        doctl apps logs $APP_ID"
echo "   List deployments: doctl apps list-deployments $APP_ID"
echo "   Get app details:  doctl apps get $APP_ID"
echo "   Update app:       doctl apps update $APP_ID --spec app.yaml"
echo ""
echo -e "${YELLOW}📚 Next Steps:${NC}"
echo "   1. Access the admin console and change default password"
echo "   2. Configure your custom domain (optional)"
echo "   3. Set up email service (SendGrid, etc.)"
echo "   4. Configure backup policy"
echo "   5. Enable monitoring alerts"
echo ""
echo -e "${BLUE}Need help? Check the deployment guide:${NC}"
echo "   deploy/digitalocean/README.md"
echo ""
echo -e "${GREEN}Happy planning! 🙏${NC}"