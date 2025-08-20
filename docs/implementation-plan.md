# Cape Christian Sermon Planning System - Implementation Plan

## Executive Summary
A comprehensive sermon planning platform built on AppFlowy Cloud, deployed on DigitalOcean, enabling collaborative sermon planning, content management, and multi-format exports for Cape Christian Fellowship.

## Phase 1: Foundation (Week 1-2)

### 1.1 Environment Setup
- [ ] Clone AppFlowy repository: `gh repo clone AppFlowy-IO/AppFlowy`
- [ ] Setup DigitalOcean account and resources
- [ ] Configure development environment with Docker Compose
- [ ] Setup Firebase project for authentication

### 1.2 Database Schema Design
```sql
-- Core tables aligned with AppFlowy + sermon-specific needs
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    settings JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    auth_provider VARCHAR(50),
    firebase_uid VARCHAR(255),
    roles TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workspaces (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    name VARCHAR(255),
    type VARCHAR(50), -- 'annual', 'series', 'sermon'
    settings JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sermon_series (
    id UUID PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id),
    title VARCHAR(255),
    theme VARCHAR(255),
    start_date DATE,
    end_date DATE,
    description TEXT,
    metadata JSONB
);

CREATE TABLE sermons (
    id UUID PRIMARY KEY,
    series_id UUID REFERENCES sermon_series(id),
    title VARCHAR(255),
    speaker VARCHAR(255),
    date DATE,
    scripture_references JSONB,
    topics TEXT[],
    status VARCHAR(50), -- 'draft', 'review', 'approved', 'delivered'
    content_blocks JSONB,
    timeline_phase VARCHAR(50)
);

CREATE TABLE timeline_events (
    id UUID PRIMARY KEY,
    sermon_id UUID REFERENCES sermons(id),
    phase VARCHAR(50), -- 'brainstorm', 'content', 'wordsmith', 'production', 'delivery', 'archive'
    scheduled_date TIMESTAMP,
    completed_date TIMESTAMP,
    assigned_to UUID REFERENCES users(id),
    notes TEXT
);

CREATE TABLE assets (
    id UUID PRIMARY KEY,
    entity_id UUID, -- sermon_id or series_id
    entity_type VARCHAR(50),
    s3_key VARCHAR(500),
    content_type VARCHAR(100),
    size_bytes BIGINT,
    metadata JSONB
);

CREATE TABLE exports (
    id UUID PRIMARY KEY,
    entity_id UUID,
    entity_type VARCHAR(50),
    format VARCHAR(20), -- 'pdf', 'xlsx', 'ical', 'json'
    status VARCHAR(50),
    s3_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 1.3 Authentication Architecture
- Firebase Auth integration with Gmail SSO
- JWT token validation middleware
- Session management with Redis
- Role-based access control (RBAC)

## Phase 2: Core Services (Week 3-4)

### 2.1 Backend API Services
```typescript
// API Endpoints Structure
/api/v1/
  /auth
    POST /login
    POST /logout
    GET /profile
  
  /workspaces
    GET /
    POST /
    GET /:id
    PUT /:id
    DELETE /:id
  
  /series
    GET /
    POST /
    GET /:id
    PUT /:id
    DELETE /:id
    GET /:id/sermons
  
  /sermons
    GET /
    POST /
    GET /:id
    PUT /:id
    DELETE /:id
    POST /:id/timeline
    GET /:id/assets
  
  /timeline
    GET /events
    POST /events
    PUT /events/:id
    GET /calendar
  
  /exports
    POST /generate
    GET /:id
    GET /list
  
  /assets
    POST /upload
    GET /:id
    DELETE /:id
```

### 2.2 Storage Service
- DigitalOcean Spaces integration
- Presigned URL generation
- Asset management and CDN delivery
- File type validation and virus scanning

### 2.3 Export Service
- PDF generation with Puppeteer
- Excel export with ExcelJS
- iCal generation for calendar integration
- JSON export for data portability

## Phase 3: Frontend Development (Week 5-6)

### 3.1 UI Components
```typescript
// Component Architecture
/components
  /workspace
    - WorkspaceList
    - WorkspaceEditor
    - WorkspaceSettings
  
  /planning
    - AnnualPlanView
    - SeriesCard
    - SermonCard
    - TimelineView
  
  /editor
    - BlockEditor (AppFlowy integration)
    - ScriptureSelector
    - TopicTagger
    - MediaUploader
  
  /calendar
    - DragDropCalendar
    - TimelinePhases
    - MeetingScheduler
  
  /collaboration
    - RealTimeEditor
    - VersionHistory
    - CommentThread
  
  /export
    - ExportDialog
    - FormatSelector
    - DateRangePicker
```

### 3.2 State Management
- React Context for global state
- WebSocket for real-time updates
- Local storage for drafts
- Optimistic UI updates

### 3.3 Calendar & Timeline
- 6-phase sermon preparation workflow
- Drag-and-drop interface
- Visual timeline with milestones
- Meeting schedule integration

## Phase 4: Integration (Week 7-8)

### 4.1 AppFlowy Integration
- Document blocks for sermon content
- Collaborative editing features
- Version control and history
- Permission system integration

### 4.2 Bible API Integration
- Scripture.api.bible integration
- YouVersion support
- BibleGateway compatibility
- Scripture reference validation

### 4.3 Real-time Collaboration
- WebSocket server setup
- CRDT/OT implementation
- Presence indicators
- Conflict resolution

## Phase 5: Deployment (Week 9-10)

### 5.1 Docker Compose Configuration
```yaml
version: '3.9'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/letsencrypt
    depends_on:
      - api
      - frontend

  api:
    build: ./backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - S3_ENDPOINT=${S3_ENDPOINT}
      - FIREBASE_CONFIG=${FIREBASE_CONFIG}
    depends_on:
      - redis
    ports:
      - "8080:8080"

  frontend:
    build: ./frontend
    environment:
      - REACT_APP_API_URL=http://api:8080
      - REACT_APP_FIREBASE_CONFIG=${FIREBASE_CONFIG}
    ports:
      - "3000:3000"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### 5.2 DigitalOcean Setup
- Droplet provisioning (4GB RAM minimum)
- Managed PostgreSQL database
- Spaces bucket configuration
- Load balancer setup (optional)
- SSL certificates with Let's Encrypt

### 5.3 CI/CD Pipeline
```yaml
# GitHub Actions workflow
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push Docker images
      - name: Deploy to DigitalOcean
      - name: Run database migrations
      - name: Health check
```

## Phase 6: Testing & Quality (Week 11-12)

### 6.1 Testing Strategy
- Unit tests for services
- Integration tests for API
- E2E tests for critical workflows
- Performance testing
- Security scanning

### 6.2 Monitoring & Observability
- Application metrics with Prometheus
- Log aggregation with Loki
- Error tracking with Sentry
- Uptime monitoring
- Performance dashboards

## Key Milestones

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 2 | Foundation Complete | Database schema, auth setup |
| 4 | Backend Services | API endpoints, storage integration |
| 6 | Frontend MVP | UI components, calendar system |
| 8 | Integration Complete | AppFlowy, Bible API, real-time |
| 10 | Deployment Ready | Docker setup, DigitalOcean config |
| 12 | Production Launch | Tested, monitored, documented |

## Risk Mitigation

1. **AppFlowy Integration Complexity**
   - Mitigation: Start with basic document blocks, enhance incrementally

2. **Real-time Collaboration**
   - Mitigation: Use proven CRDT libraries, implement graceful degradation

3. **Data Migration**
   - Mitigation: Build import tools for existing data, provide manual entry UI

4. **Performance at Scale**
   - Mitigation: Implement caching, optimize queries, use CDN for assets

## Success Criteria

- [ ] 52 sermons manageable annually
- [ ] 12 series with full tracking
- [ ] 8 themes organization
- [ ] Multi-format export working
- [ ] Real-time collaboration functional
- [ ] < 10 min onboarding time
- [ ] < 1% downtime
- [ ] Daily automated backups

## Next Steps

1. Review and approve implementation plan
2. Setup development environment
3. Begin Phase 1 foundation work
4. Weekly progress reviews
5. Stakeholder demos every 2 weeks

---

*Document Version: 1.0*
*Last Updated: 2025-08-20*
*Owner: Engineering Team*