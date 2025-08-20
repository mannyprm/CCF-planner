-- Cape Christian Sermon Planning Database Schema
-- PostgreSQL 15+
-- AppFlowy Integration + Sermon-Specific Extensions

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Organizations table for multi-church support (future)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users with Firebase Auth integration
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    auth_provider VARCHAR(50) DEFAULT 'firebase',
    avatar_url TEXT,
    roles TEXT[] DEFAULT ARRAY['viewer'],
    permissions JSONB DEFAULT '{}',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspaces aligned with AppFlowy structure
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) CHECK (type IN ('annual', 'series', 'sermon', 'meeting', 'resource')),
    icon VARCHAR(50),
    color VARCHAR(7),
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SERMON PLANNING TABLES
-- =====================================================

-- Annual planning periods
CREATE TABLE annual_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    theme VARCHAR(255),
    vision_statement TEXT,
    key_scriptures JSONB DEFAULT '[]',
    goals JSONB DEFAULT '[]',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, year)
);

-- Sermon series (collections of sermons)
CREATE TABLE sermon_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annual_plan_id UUID REFERENCES annual_plans(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    theme VARCHAR(255),
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    series_number INTEGER,
    artwork_url TEXT,
    key_scriptures JSONB DEFAULT '[]',
    topics TEXT[] DEFAULT ARRAY[]::TEXT[],
    target_audience VARCHAR(100),
    goals JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'archived')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual sermons
CREATE TABLE sermons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID REFERENCES sermon_series(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    sermon_number INTEGER,
    speaker_id UUID REFERENCES users(id),
    speaker_name VARCHAR(255),
    scheduled_date DATE NOT NULL,
    delivered_date DATE,
    service_time TIME,
    duration_minutes INTEGER,
    
    -- Scripture and content
    primary_scripture VARCHAR(255),
    scripture_references JSONB DEFAULT '[]',
    topics TEXT[] DEFAULT ARRAY[]::TEXT[],
    keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    summary TEXT,
    key_points JSONB DEFAULT '[]',
    illustrations JSONB DEFAULT '[]',
    
    -- AppFlowy document integration
    document_id UUID,
    content_blocks JSONB DEFAULT '[]',
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'delivered', 'archived')),
    timeline_phase VARCHAR(50) DEFAULT 'brainstorm',
    
    -- Metadata
    call_to_action TEXT,
    target_audience VARCHAR(100),
    ministry_focus VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TIMELINE & PLANNING TABLES
-- =====================================================

-- Sermon preparation timeline phases
CREATE TABLE timeline_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sermon_id UUID REFERENCES sermons(id) ON DELETE CASCADE,
    phase VARCHAR(50) NOT NULL CHECK (phase IN (
        'brainstorm',
        'content_planning',
        'wordsmith',
        'review',
        'production',
        'rehearsal',
        'delivery',
        'archive'
    )),
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    notes TEXT,
    checklist JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sermon_id, phase)
);

-- Meeting schedules
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('series_planning', 'content_planning', 'wordsmith', 'review', 'other')),
    description TEXT,
    location VARCHAR(255),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    recurring_pattern JSONB,
    attendees UUID[] DEFAULT ARRAY[]::UUID[],
    agenda JSONB DEFAULT '[]',
    notes TEXT,
    action_items JSONB DEFAULT '[]',
    related_sermon_id UUID REFERENCES sermons(id),
    related_series_id UUID REFERENCES sermon_series(id),
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COLLABORATION TABLES
-- =====================================================

-- Comments on sermons/series
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('sermon', 'series', 'meeting', 'timeline_phase')),
    parent_comment_id UUID REFERENCES comments(id),
    user_id UUID REFERENCES users(id) NOT NULL,
    content TEXT NOT NULL,
    mentions UUID[] DEFAULT ARRAY[]::UUID[],
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Version history for content
CREATE TABLE versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('sermon', 'series', 'document')),
    version_number INTEGER NOT NULL,
    content JSONB NOT NULL,
    change_summary TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(entity_id, entity_type, version_number)
);

-- =====================================================
-- ASSETS & MEDIA TABLES
-- =====================================================

-- File assets stored in DigitalOcean Spaces
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('sermon', 'series', 'meeting', 'workspace')),
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    s3_bucket VARCHAR(100),
    s3_key VARCHAR(500) UNIQUE NOT NULL,
    s3_url TEXT,
    cdn_url TEXT,
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- EXPORT & REPORTING TABLES
-- =====================================================

-- Export jobs and history
CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID,
    entity_type VARCHAR(50) CHECK (entity_type IN ('sermon', 'series', 'annual_plan', 'calendar')),
    format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'xlsx', 'docx', 'ical', 'json', 'csv')),
    date_range_start DATE,
    date_range_end DATE,
    filters JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0,
    file_url TEXT,
    error_message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- AUDIT & SYSTEM TABLES
-- =====================================================

-- Audit log for compliance and tracking
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions for auth management
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);

-- Workspace indexes
CREATE INDEX idx_workspaces_org_id ON workspaces(org_id);
CREATE INDEX idx_workspaces_type ON workspaces(type);

-- Sermon indexes
CREATE INDEX idx_sermons_series_id ON sermons(series_id);
CREATE INDEX idx_sermons_scheduled_date ON sermons(scheduled_date);
CREATE INDEX idx_sermons_status ON sermons(status);
CREATE INDEX idx_sermons_speaker_id ON sermons(speaker_id);

-- Series indexes
CREATE INDEX idx_series_annual_plan_id ON sermon_series(annual_plan_id);
CREATE INDEX idx_series_dates ON sermon_series(start_date, end_date);
CREATE INDEX idx_series_status ON sermon_series(status);

-- Timeline indexes
CREATE INDEX idx_timeline_sermon_id ON timeline_phases(sermon_id);
CREATE INDEX idx_timeline_phase ON timeline_phases(phase);
CREATE INDEX idx_timeline_assigned_to ON timeline_phases(assigned_to);

-- Meeting indexes
CREATE INDEX idx_meetings_scheduled_time ON meetings(scheduled_time);
CREATE INDEX idx_meetings_type ON meetings(type);

-- Asset indexes
CREATE INDEX idx_assets_entity ON assets(entity_id, entity_type);
CREATE INDEX idx_assets_s3_key ON assets(s3_key);

-- Comment indexes
CREATE INDEX idx_comments_entity ON comments(entity_id, entity_type);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- Audit indexes
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sermon_series_updated_at BEFORE UPDATE ON sermon_series
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sermons_updated_at BEFORE UPDATE ON sermons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_phases_updated_at BEFORE UPDATE ON timeline_phases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default organization
INSERT INTO organizations (name, slug, settings) VALUES 
    ('Cape Christian Fellowship', 'cape-christian', '{"timezone": "America/New_York"}');

-- Insert default timeline phase templates
-- This would be loaded from configuration but included here for reference
/*
INSERT INTO phase_templates (phase, default_duration_days, checklist) VALUES
    ('brainstorm', 14, '["Research topic", "Gather illustrations", "Prayer and meditation"]'),
    ('content_planning', 7, '["Outline main points", "Select scriptures", "Define call to action"]'),
    ('wordsmith', 3, '["Refine language", "Check flow", "Practice delivery"]'),
    ('production', 2, '["Create slides", "Prepare handouts", "Tech check"]'),
    ('delivery', 1, '["Final review", "Prayer", "Deliver sermon"]');
*/