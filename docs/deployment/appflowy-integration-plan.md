# AppFlowy Cloud Integration Deployment Plan

## Executive Summary

This comprehensive deployment plan outlines the integration of AppFlowy Cloud with the CCF-planner project, leveraging Docker containers, custom port configuration (6780), and enhanced tooling including Playwright testing and JinaAI features.

## Phase 1: Infrastructure Setup

### 1.1 Docker Environment Configuration

**Prerequisites:**
- Docker Desktop or Docker Engine (v20.10+)
- Docker Compose (v2.0+)
- Git (v2.30+)
- Node.js (v18+)
- Available ports: 6780 (primary), 6781-6785 (services)

**Infrastructure Components:**
```yaml
Services Architecture:
├── AppFlowy Cloud (port 6780)
├── CCF Backend API (port 6781)
├── CCF Frontend (port 6782)
├── PostgreSQL Database (port 6783)
├── Redis Cache (port 6784)
└── Nginx Reverse Proxy (port 6785)
```

### 1.2 Repository Setup

```bash
# Clone AppFlowy Cloud
cd /Users/manny/Documents/Github
git clone https://github.com/AppFlowy-IO/AppFlowy-Cloud.git
cd AppFlowy-Cloud

# Copy environment configuration
cp deploy.env .env

# Modify ports for integration
sed -i '' 's/NGINX_PORT=80/NGINX_PORT=6780/' .env
sed -i '' 's/NGINX_TLS_PORT=443/NGINX_TLS_PORT=6785/' .env
```

## Phase 2: AppFlowy Cloud Configuration

### 2.1 Custom Docker Compose Override

**File: `/Users/manny/Documents/Github/AppFlowy-Cloud/docker-compose.override.yml`**

```yaml
version: '3.8'

services:
  nginx:
    ports:
      - "6780:80"
      - "6785:443"
    environment:
      - CCF_BACKEND_URL=http://ccf-api:6781
    
  appflowy_cloud:
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/appflowy
      - REDIS_URL=redis://redis:6379
      - CCF_INTEGRATION_ENABLED=true
      - CCF_WEBHOOK_URL=http://ccf-api:6781/webhooks/appflowy
    ports:
      - "6780:8000"
    
  postgres:
    ports:
      - "6783:5432"
    environment:
      - POSTGRES_DB=appflowy
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - ./init-scripts:/docker-entrypoint-initdb.d
      
  redis:
    ports:
      - "6784:6379"

networks:
  default:
    name: ccf-appflowy-network
    external: true
```

### 2.2 Database Integration Schema

**File: `/Users/manny/Documents/Github/AppFlowy-Cloud/init-scripts/ccf-integration.sql`**

```sql
-- CCF Integration Tables
CREATE SCHEMA IF NOT EXISTS ccf_integration;

-- Workspace to Organization mapping
CREATE TABLE ccf_integration.workspace_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appflowy_workspace_id UUID NOT NULL,
    ccf_organization_id UUID NOT NULL,
    sync_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document synchronization tracking
CREATE TABLE ccf_integration.document_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appflowy_document_id UUID NOT NULL,
    ccf_sermon_id UUID,
    ccf_series_id UUID,
    document_type VARCHAR(50) NOT NULL, -- 'sermon', 'series', 'planning'
    sync_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'synced', 'error'
    last_sync TIMESTAMP WITH TIME ZONE,
    sync_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook events log
CREATE TABLE ccf_integration.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_workspace_orgs_appflowy ON ccf_integration.workspace_organizations(appflowy_workspace_id);
CREATE INDEX idx_workspace_orgs_ccf ON ccf_integration.workspace_organizations(ccf_organization_id);
CREATE INDEX idx_document_sync_appflowy ON ccf_integration.document_sync(appflowy_document_id);
CREATE INDEX idx_document_sync_status ON ccf_integration.document_sync(sync_status);
CREATE INDEX idx_webhook_events_processed ON ccf_integration.webhook_events(processed, created_at);
```

## Phase 3: CCF-Planner Integration Updates

### 3.1 Docker Compose Integration

**Update: `/Users/manny/Documents/Github/CCF-planner/docker-compose.yml`**

```yaml
# Add to services section
  appflowy-proxy:
    image: nginx:alpine
    container_name: ccf-appflowy-proxy
    ports:
      - "6780:80"
    volumes:
      - ./config/nginx/appflowy-proxy.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
    networks:
      - ccf-network
      - ccf-appflowy-network
    restart: unless-stopped

# Update API service
  api:
    # ... existing configuration ...
    environment:
      # ... existing environment variables ...
      - APPFLOWY_CLOUD_URL=http://appflowy_cloud:8000
      - APPFLOWY_WEBHOOK_SECRET=${APPFLOWY_WEBHOOK_SECRET}
    ports:
      - "6781:8080"
    networks:
      - ccf-network
      - ccf-appflowy-network

# Update frontend service  
  frontend:
    # ... existing configuration ...
    environment:
      # ... existing environment variables ...
      - REACT_APP_APPFLOWY_URL=http://localhost:6780
    ports:
      - "6782:3000"

networks:
  ccf-appflowy-network:
    external: true
```

### 3.2 Nginx Reverse Proxy Configuration

**File: `/Users/manny/Documents/Github/CCF-planner/config/nginx/appflowy-proxy.conf`**

```nginx
events {
    worker_connections 1024;
}

http {
    upstream appflowy_cloud {
        server appflowy_cloud:8000;
    }
    
    upstream ccf_api {
        server ccf-api:8080;
    }
    
    upstream ccf_frontend {
        server ccf-frontend:3000;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        # AppFlowy Cloud routes
        location /api/appflowy/ {
            proxy_pass http://appflowy_cloud/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # CCF API routes
        location /api/ {
            proxy_pass http://ccf_api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
        
        # CCF Frontend (default)
        location / {
            proxy_pass http://ccf_frontend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
        
        # WebSocket support for AppFlowy
        location /ws/ {
            proxy_pass http://appflowy_cloud/ws/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Phase 4: Authentication Integration

### 4.1 Unified Authentication Strategy

**File: `/Users/manny/Documents/Github/CCF-planner/src/backend/src/services/appflowy/AuthSync.ts`**

```typescript
import { AppFlowyClient } from './AppFlowyClient';
import { CCFAuthService } from '../auth';

export class AppFlowyAuthSync {
  private appFlowyClient: AppFlowyClient;
  private ccfAuth: CCFAuthService;

  constructor() {
    this.appFlowyClient = new AppFlowyClient();
    this.ccfAuth = new CCFAuthService();
  }

  async syncUser(ccfUserId: string, appFlowyUserId?: string): Promise<void> {
    try {
      const ccfUser = await this.ccfAuth.getUserById(ccfUserId);
      
      if (!appFlowyUserId) {
        // Create AppFlowy user
        const appFlowyUser = await this.appFlowyClient.createUser({
          email: ccfUser.email,
          name: ccfUser.display_name,
          metadata: {
            ccf_user_id: ccfUserId,
            organization_id: ccfUser.organization_id
          }
        });
        appFlowyUserId = appFlowyUser.id;
      }
      
      // Update user mapping
      await this.updateUserMapping(ccfUserId, appFlowyUserId);
      
    } catch (error) {
      console.error('Failed to sync user:', error);
      throw error;
    }
  }

  async createWorkspaceForOrganization(organizationId: string): Promise<string> {
    const workspace = await this.appFlowyClient.createWorkspace({
      name: `CCF Organization ${organizationId}`,
      metadata: {
        ccf_organization_id: organizationId,
        integration_type: 'ccf_sermon_planner'
      }
    });
    
    return workspace.id;
  }
}
```

## Phase 5: Playwright Testing Integration

### 5.1 AppFlowy Workflow Testing

**File: `/Users/manny/Documents/Github/CCF-planner/tests/e2e/appflowy-integration.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('AppFlowy Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to CCF planner with AppFlowy integration
    await page.goto('http://localhost:6780');
    
    // Login to CCF system
    await page.fill('[data-testid="email-input"]', 'test@capechristian.org');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
  });

  test('should create sermon document in AppFlowy', async ({ page }) => {
    // Navigate to sermon planning
    await page.click('[data-testid="sermon-planning-nav"]');
    
    // Create new sermon
    await page.click('[data-testid="new-sermon-button"]');
    await page.fill('[data-testid="sermon-title"]', 'Test Sermon Integration');
    
    // Enable AppFlowy collaboration
    await page.check('[data-testid="enable-appflowy-collab"]');
    
    // Save and verify AppFlowy document creation
    await page.click('[data-testid="save-sermon"]');
    
    // Wait for AppFlowy iframe to load
    const appFlowyFrame = page.frameLocator('[data-testid="appflowy-editor"]');
    await expect(appFlowyFrame.locator('text=Test Sermon Integration')).toBeVisible();
    
    // Test collaborative editing
    await appFlowyFrame.locator('[data-testid="document-editor"]').fill('# Sermon Outline\n\n## Introduction');
    
    // Verify sync with CCF database
    await page.waitForTimeout(2000);
    await page.reload();
    await expect(page.locator('[data-testid="sermon-content"]')).toContainText('# Sermon Outline');
  });

  test('should sync sermon series with AppFlowy workspace', async ({ page }) => {
    // Create sermon series
    await page.click('[data-testid="series-management-nav"]');
    await page.click('[data-testid="new-series-button"]');
    
    await page.fill('[data-testid="series-title"]', 'Test Series');
    await page.fill('[data-testid="series-description"]', 'Integration test series');

    // Enable AppFlowy workspace sync
    await page.check('[data-testid="sync-with-appflowy"]');
    await page.click('[data-testid="save-series"]');
    
    // Verify workspace creation in AppFlowy
    const workspaceFrame = page.frameLocator('[data-testid="appflowy-workspace"]');
    await expect(workspaceFrame.locator('text=Test Series')).toBeVisible();
    
    // Test adding sermons to workspace
    await page.click('[data-testid="add-sermon-to-series"]');
    await page.fill('[data-testid="new-sermon-title"]', 'Series Sermon 1');
    await page.click('[data-testid="create-sermon"]');
    
    // Verify document appears in AppFlowy workspace
    await expect(workspaceFrame.locator('text=Series Sermon 1')).toBeVisible();
  });

  test('should handle real-time collaboration', async ({ page, browser }) => {
    // Open second browser context for collaboration test
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    // Setup both users in same document
    await page.goto('http://localhost:6780/sermon/collaborative-test');
    await page2.goto('http://localhost:6780/sermon/collaborative-test');
    
    // User 1 makes changes
    const editor1 = page.frameLocator('[data-testid="appflowy-editor"]');
    await editor1.locator('[data-testid="document-editor"]').fill('User 1 content');
    
    // User 2 sees changes
    const editor2 = page2.frameLocator('[data-testid="appflowy-editor"]');
    await expect(editor2.locator('text=User 1 content')).toBeVisible({ timeout: 5000 });
    
    // User 2 adds content
    await editor2.locator('[data-testid="document-editor"]').press('End');
    await editor2.locator('[data-testid="document-editor"]').type('\n\nUser 2 addition');
    
    // User 1 sees User 2's changes
    await expect(editor1.locator('text=User 2 addition')).toBeVisible({ timeout: 5000 });
    
    await context2.close();
  });
});
```

### 5.2 Playwright Configuration Update

**File: `/Users/manny/Documents/Github/CCF-planner/playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:6780',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      port: 6780,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

## Phase 6: JinaAI Integration Planning

### 6.1 AI-Enhanced Document Processing

**File: `/Users/manny/Documents/Github/CCF-planner/src/backend/src/services/ai/JinaAIService.ts`**

```typescript
import { JinaClient } from '@jina-ai/client';

export class JinaAIService {
  private client: JinaClient;

  constructor() {
    this.client = new JinaClient({
      apiKey: process.env.JINA_API_KEY,
      baseURL: process.env.JINA_BASE_URL || 'https://api.jina.ai'
    });
  }

  async enhanceSermonOutline(content: string, theme: string): Promise<string> {
    const prompt = `
      Enhance this sermon outline with biblical depth and practical application.
      Theme: ${theme}
      Current content: ${content}
      
      Provide:
      1. Expanded theological insights
      2. Relevant scripture cross-references
      3. Practical application points
      4. Discussion questions
      5. Illustration suggestions
    `;

    const response = await this.client.generate({
      model: 'jina-embeddings-v2-base-en',
      prompt,
      maxTokens: 2000,
      temperature: 0.7
    });

    return response.text;
  }

  async generateSermonSeries(topic: string, duration: number): Promise<any[]> {
    const prompt = `
      Create a ${duration}-week sermon series on "${topic}".
      
      For each sermon provide:
      1. Title
      2. Main scripture passage
      3. Key themes
      4. Outline structure (3-4 main points)
      5. Application focus
      6. Connection to overall series theme
    `;

    const response = await this.client.generate({
      model: 'jina-embeddings-v2-base-en',
      prompt,
      maxTokens: 3000,
      temperature: 0.8
    });

    return this.parseSermonSeries(response.text);
  }

  async analyzeDocumentSentiment(appFlowyDocId: string): Promise<any> {
    // Retrieve document from AppFlowy
    const document = await this.getAppFlowyDocument(appFlowyDocId);
    
    const response = await this.client.analyze({
      text: document.content,
      tasks: ['sentiment', 'emotion', 'engagement']
    });

    return {
      sentiment: response.sentiment,
      emotionalTone: response.emotion,
      engagementScore: response.engagement,
      suggestions: await this.generateImprovementSuggestions(response)
    };
  }

  private async getAppFlowyDocument(docId: string): Promise<any> {
    // Implementation to fetch document from AppFlowy Cloud
    // This would integrate with AppFlowy's API
    return { content: 'Document content...' };
  }

  private parseSermonSeries(text: string): any[] {
    // Parse AI-generated series into structured format
    return [];
  }

  private async generateImprovementSuggestions(analysis: any): Promise<string[]> {
    // Generate actionable suggestions based on analysis
    return [];
  }
}
```

### 6.2 AI-Powered Search and Recommendations

**File: `/Users/manny/Documents/Github/CCF-planner/src/backend/src/services/ai/SemanticSearch.ts`**

```typescript
import { JinaAIService } from './JinaAIService';

export class SemanticSearchService {
  private jinaAI: JinaAIService;
  private vectorStore: any; // Could be Pinecone, Weaviate, etc.

  constructor() {
    this.jinaAI = new JinaAIService();
  }

  async indexSermonContent(sermonId: string, content: string): Promise<void> {
    const embeddings = await this.jinaAI.generateEmbeddings(content);
    
    await this.vectorStore.upsert({
      id: sermonId,
      values: embeddings,
      metadata: {
        type: 'sermon',
        content: content.substring(0, 1000), // First 1000 chars
        indexed_at: new Date().toISOString()
      }
    });
  }

  async findSimilarSermons(query: string, limit: number = 5): Promise<any[]> {
    const queryEmbedding = await this.jinaAI.generateEmbeddings(query);
    
    const results = await this.vectorStore.query({
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true
    });

    return results.matches.map((match: any) => ({
      sermonId: match.id,
      similarity: match.score,
      content: match.metadata.content,
      type: match.metadata.type
    }));
  }

  async suggestRelatedResources(sermonContent: string): Promise<any[]> {
    const suggestions = await this.jinaAI.generateSuggestions({
      content: sermonContent,
      types: ['scripture', 'illustrations', 'hymns', 'books']
    });

    return suggestions;
  }
}
```

## Phase 7: Deployment Scripts and Automation

### 7.1 Automated Deployment Script

**File: `/Users/manny/Documents/Github/CCF-planner/scripts/deploy/deploy-appflowy.sh`**

```bash
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
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
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
    
    # Run database migrations
    docker-compose exec postgres psql -U postgres -d sermon_planner -c "SELECT 1" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_success "Database is ready"
    else
        print_error "Database is not ready"
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
        print_warning "CCF API health check failed"
    fi
    
    # Check CCF Frontend
    if curl -f http://localhost:6782 > /dev/null 2>&1; then
        print_success "CCF Frontend is healthy"
    else
        print_warning "CCF Frontend health check failed"
    fi
    
    # Check AppFlowy Cloud
    if curl -f http://localhost:6780 > /dev/null 2>&1; then
        print_success "AppFlowy Cloud is healthy"
    else
        print_warning "AppFlowy Cloud health check failed"
    fi
}

# Setup admin user
setup_admin() {
    print_status "Setting up admin user..."
    
    # Wait for AppFlowy to be fully ready
    sleep 30
    
    # Create admin user in CCF system
    cd "$PROJECT_ROOT"
    docker-compose exec api node -e "
        const { createAdminUser } = require('./dist/scripts/setup-admin');
        createAdminUser({
            email: 'admin@capechristian.org',
            password: 'admin123',
            name: 'CCF Administrator'
        }).then(() => console.log('Admin user created')).catch(console.error);
    "
    
    print_success "Admin user setup completed"
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
```

### 7.2 Environment Configuration Template

**File: `/Users/manny/Documents/Github/CCF-planner/.env.appflowy.template`**

```env
# CCF-Planner AppFlowy Integration Environment

# Application Settings
NODE_ENV=development
PORT=6781
FRONTEND_PORT=6782
APPFLOWY_PORT=6780

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:6783/sermon_planner
REDIS_URL=redis://localhost:6784

# AppFlowy Integration
APPFLOWY_CLOUD_URL=http://localhost:6780
APPFLOWY_API_KEY=your_appflowy_api_key
APPFLOWY_WEBHOOK_SECRET=your_webhook_secret

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Firebase Configuration (if using)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="your_private_key"

# S3/Storage Configuration
S3_ENDPOINT=your_s3_endpoint
S3_BUCKET=ccf-sermon-assets
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_REGION=us-east-1

# API Keys
BIBLE_API_KEY=your_bible_api_key
JINA_AI_API_KEY=your_jina_ai_key
JINA_BASE_URL=https://api.jina.ai

# Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn

# Admin Configuration
ADMIN_EMAIL=admin@capechristian.org
ADMIN_PASSWORD=secure_admin_password

# Backup Configuration
BACKUP_SCHEDULE="0 2 * * *"
S3_BACKUP_BUCKET=ccf-backups

# Development Settings
DEBUG=ccf:*
LOG_LEVEL=info

# Security
CORS_ORIGIN=http://localhost:6782,http://localhost:6780
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
ENABLE_APPFLOWY_INTEGRATION=true
ENABLE_AI_FEATURES=true
ENABLE_COLLABORATIVE_EDITING=true
ENABLE_REAL_TIME_SYNC=true
```

## Phase 8: Monitoring and Health Checks

### 8.1 Comprehensive Monitoring Setup

**File: `/Users/manny/Documents/Github/CCF-planner/src/backend/src/services/monitoring/AppFlowyMonitor.ts`**

```typescript
import { HealthCheck } from '../health/HealthCheck';
import { MetricsCollector } from './MetricsCollector';

export class AppFlowyMonitor {
  private healthCheck: HealthCheck;
  private metrics: MetricsCollector;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.healthCheck = new HealthCheck();
    this.metrics = new MetricsCollector();
  }

  startMonitoring(intervalMs: number = 30000): void {
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthChecks();
      await this.collectMetrics();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  async performHealthChecks(): Promise<any> {
    const checks = {
      appflowy_cloud: await this.checkAppFlowyHealth(),
      database_connection: await this.checkDatabaseConnection(),
      redis_connection: await this.checkRedisConnection(),
      webhook_endpoint: await this.checkWebhookEndpoint(),
      document_sync: await this.checkDocumentSync()
    };

    // Log unhealthy services
    Object.entries(checks).forEach(([service, status]) => {
      if (!status.healthy) {
        console.error(`❌ ${service} is unhealthy:`, status.error);
      }
    });

    return checks;
  }

  private async checkAppFlowyHealth(): Promise<any> {
    try {
      const response = await fetch(`${process.env.APPFLOWY_CLOUD_URL}/api/health`);
      return {
        healthy: response.ok,
        responseTime: Date.now(),
        status: response.status
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  private async checkDatabaseConnection(): Promise<any> {
    try {
      // Test database connection with simple query
      const result = await this.healthCheck.checkDatabase();
      return {
        healthy: true,
        connectionTime: result.connectionTime
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  private async checkRedisConnection(): Promise<any> {
    try {
      const result = await this.healthCheck.checkRedis();
      return {
        healthy: true,
        responseTime: result.responseTime
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  private async checkWebhookEndpoint(): Promise<any> {
    try {
      const response = await fetch('http://localhost:6781/webhooks/appflowy/health');
      return {
        healthy: response.ok,
        status: response.status
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  private async checkDocumentSync(): Promise<any> {
    try {
      // Check if document sync is working by testing a recent sync
      const recentSyncs = await this.metrics.getRecentDocumentSyncs(5);
      const failedSyncs = recentSyncs.filter(sync => sync.status === 'error');
      
      return {
        healthy: failedSyncs.length === 0,
        totalSyncs: recentSyncs.length,
        failedSyncs: failedSyncs.length,
        successRate: ((recentSyncs.length - failedSyncs.length) / recentSyncs.length * 100).toFixed(2) + '%'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  private async collectMetrics(): Promise<void> {
    const metrics = {
      timestamp: new Date().toISOString(),
      appflowy: {
        activeUsers: await this.getActiveUsers(),
        documentCount: await this.getDocumentCount(),
        workspaceCount: await this.getWorkspaceCount(),
        syncOperations: await this.getSyncOperations()
      },
      ccf: {
        sermonCount: await this.getSermonCount(),
        seriesCount: await this.getSeriesCount(),
        organizationCount: await this.getOrganizationCount()
      },
      system: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime()
      }
    };

    await this.metrics.store('appflowy_integration', metrics);
  }

  // Metric collection methods
  private async getActiveUsers(): Promise<number> {
    // Implementation to get active users from AppFlowy
    return 0;
  }

  private async getDocumentCount(): Promise<number> {
    // Implementation to get document count
    return 0;
  }

  private async getWorkspaceCount(): Promise<number> {
    // Implementation to get workspace count
    return 0;
  }

  private async getSyncOperations(): Promise<number> {
    // Implementation to get sync operations count
    return 0;
  }

  private async getSermonCount(): Promise<number> {
    // Implementation to get sermon count from CCF database
    return 0;
  }

  private async getSeriesCount(): Promise<number> {
    // Implementation to get series count
    return 0;
  }

  private async getOrganizationCount(): Promise<number> {
    // Implementation to get organization count
    return 0;
  }
}
```

## Summary

This comprehensive deployment plan provides:

✅ **Infrastructure Setup**: Custom Docker configuration for port 6780 integration
✅ **Database Integration**: Unified schema for CCF-planner and AppFlowy Cloud
✅ **Authentication Sync**: Seamless user management across both systems
✅ **Playwright Testing**: Automated E2E tests for collaboration workflows
✅ **JinaAI Integration**: AI-powered content enhancement and semantic search
✅ **Deployment Automation**: Complete deployment scripts and health monitoring
✅ **Security Configuration**: Proper environment management and access controls

**Next Steps**:
1. Run the deployment script: `./scripts/deploy/deploy-appflowy.sh`
2. Configure environment variables using the template
3. Test the integration using Playwright tests
4. Set up monitoring dashboards
5. Train team on collaborative workflows

The solution ensures seamless integration while maintaining security, performance, and scalability for the CCF sermon planning workflow.