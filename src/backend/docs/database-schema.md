# CCF Sermon Planning Database Schema

## Overview

The CCF Sermon Planning System database is designed to support multi-church organizations with comprehensive sermon planning, resource management, and team collaboration features.

## Database Structure

### Core Tables

#### 1. Organizations (`organizations`)
- **Purpose**: Multi-church support at the top level
- **Key Features**: Subscription management, branding, settings
- **Relationships**: One-to-many with workspaces and users

#### 2. Workspaces (`workspaces`) 
- **Purpose**: Annual planning containers (e.g., "2024 Sermon Planning")
- **Key Features**: Year-based planning, church-specific settings
- **Relationships**: Belongs to organization, contains all planning data

#### 3. Users (`users`)
- **Purpose**: Firebase-integrated user management
- **Key Features**: Role-based permissions, preferences, activity tracking
- **Relationships**: Belongs to organization, can access multiple workspaces

### Planning Tables

#### 4. Themes (`themes`)
- **Purpose**: 8 annual themes for systematic planning
- **Key Features**: Scripture associations, seasonal connections, usage tracking
- **Relationships**: Many-to-many with sermons and series

#### 5. Sermon Series (`sermon_series`)
- **Purpose**: 12 series per year (quarterly planning)
- **Key Features**: Date ranges, types (expository/topical), progress tracking
- **Relationships**: Contains multiple sermons, associated with themes

#### 6. Sermons (`sermons`)
- **Purpose**: Individual sermon records (52 per year)
- **Key Features**: Complete sermon details, preparation status, publishing
- **Relationships**: Belongs to series, associated with themes and resources

### Support Tables

#### 7. Media Resources (`media_resources`)
- **Purpose**: File and link management for sermons/series
- **Key Features**: File storage, access control, version management
- **Relationships**: Flexible association with sermons, series, or standalone

#### 8. Collaborators (`collaborators`)
- **Purpose**: Team assignments and permissions
- **Key Features**: Role-based access, invitation system, activity tracking
- **Relationships**: Links users to workspaces/sermons/series

#### 9. Activity Logs (`activity_logs`)
- **Purpose**: Comprehensive audit trail
- **Key Features**: Action tracking, change history, security monitoring
- **Relationships**: References all entities for complete audit

#### 10. Export History (`export_history`)
- **Purpose**: Track and manage data exports
- **Key Features**: Multiple formats, scheduling, sharing capabilities
- **Relationships**: Workspace-scoped with user attribution

### Junction Tables

#### 11. Sermon Themes (`sermon_themes`)
- **Purpose**: Many-to-many relationship between sermons and themes
- **Key Features**: Primary theme designation, relevance scoring

#### 12. Series Themes (`series_themes`)
- **Purpose**: Many-to-many relationship between series and themes  
- **Key Features**: Emphasis levels, thematic connections

## Key Features

### 1. Multi-Church Architecture
```sql
Organizations (1) → Workspaces (Many) → Users/Content (Many)
```

### 2. Annual Planning Structure
- **8 Themes** per year (foundational concepts)
- **12 Series** per year (quarterly organization)  
- **52 Sermons** per year (weekly services)

### 3. Flexible Relationships
- Sermons can belong to series or be standalone
- Themes can be associated with multiple sermons/series
- Resources can be shared across different content types

### 4. Advanced Features
- **Full-text search** on content fields
- **Automated triggers** for timestamps and counts
- **Activity logging** for audit trails
- **Permission system** with granular control
- **File management** with versioning

## Indexes and Performance

### Primary Indexes
- All foreign keys are indexed
- Date-based queries (service_date, created_at)
- User lookup fields (email, firebase_uid)
- Full-text search on content

### Composite Indexes
- Workspace + date combinations
- Entity + action + time (for activity logs)
- Series + sermon number (for ordering)

### Partial Indexes
- Active records only
- Published content
- Recent activity (last 30 days)

## Triggers and Automation

### 1. Timestamp Triggers
```sql
update_updated_at_column() -- Updates updated_at on all changes
```

### 2. Activity Logging
```sql
log_activity() -- Automatic audit trail for key operations
```

### 3. Count Maintenance
```sql
update_series_sermon_count() -- Keeps series.actual_sermons accurate
update_theme_usage_count() -- Tracks theme.sermon_count
```

## Security and Permissions

### 1. Row-Level Security
- Workspace-based data isolation
- User role enforcement
- Organization boundaries

### 2. Access Control
- Role-based permissions (admin, pastor, volunteer, viewer)
- Granular collaboration permissions
- Resource access levels (public, workspace, private)

### 3. Data Protection
- Soft deletes with `deleted_at` timestamps
- Sensitive data flagging in activity logs
- File access controls and expiration

## Usage Examples

### Creating a New Sermon Series
```sql
-- 1. Create the series
INSERT INTO sermon_series (workspace_id, title, start_date, ...)

-- 2. Associate with themes
INSERT INTO series_themes (series_id, theme_id, is_primary_theme, ...)

-- 3. Create sermons in the series
INSERT INTO sermons (series_id, sermon_number, title, ...)

-- 4. Add resources
INSERT INTO media_resources (series_id, title, resource_type, ...)
```

### Planning Annual Themes
```sql
-- Create 8 themes for the year
INSERT INTO themes (workspace_id, name, associated_months, ...)

-- Associate themes with planned series
INSERT INTO series_themes (series_id, theme_id, emphasis_level, ...)
```

### Team Collaboration
```sql
-- Add team member to workspace
INSERT INTO collaborators (workspace_id, user_id, role, ...)

-- Assign specific sermon tasks
INSERT INTO collaborators (sermon_id, user_id, assignment_title, ...)
```

## Migration and Setup

### Running Migrations
```bash
# Run all migrations
npm run migrate

# Run with sample data
npm run setup:db -- --seed
```

### Environment Setup
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/sermon_planner
FIREBASE_PROJECT_ID=your-project-id
```

### Dependencies
- PostgreSQL 12+
- UUID extension
- pg_trgm extension (for full-text search)

## Backup and Maintenance

### Regular Maintenance
- Clean up expired export files
- Archive old activity logs
- Update usage statistics

### Backup Strategy
- Daily automated backups
- Point-in-time recovery capability
- Cross-region replication for production

---

**Last Updated**: 2024-01-20  
**Schema Version**: 1.0.0  
**Migration Count**: 13