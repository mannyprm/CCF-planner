import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create function to update updated_at timestamp
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Create function for activity logging
  await knex.raw(`
    CREATE OR REPLACE FUNCTION log_activity()
    RETURNS TRIGGER AS $$
    DECLARE
      action_type text;
      entity_name text;
      workspace_uuid uuid;
      user_uuid uuid;
      changes_json jsonb := '{}';
    BEGIN
      -- Determine action type
      IF TG_OP = 'INSERT' THEN
        action_type := 'create';
      ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update';
      ELSIF TG_OP = 'DELETE' THEN
        action_type := 'delete';
      END IF;
      
      -- Get workspace_id and other details based on table
      CASE TG_TABLE_NAME
        WHEN 'sermons' THEN
          workspace_uuid := COALESCE(NEW.workspace_id, OLD.workspace_id);
          user_uuid := COALESCE(NEW.created_by, OLD.created_by);
          entity_name := COALESCE(NEW.title, OLD.title);
          IF TG_OP = 'UPDATE' THEN
            changes_json := jsonb_build_object(
              'title', jsonb_build_object('old', OLD.title, 'new', NEW.title),
              'status', jsonb_build_object('old', OLD.status, 'new', NEW.status),
              'service_date', jsonb_build_object('old', OLD.service_date, 'new', NEW.service_date)
            );
          END IF;
        WHEN 'sermon_series' THEN
          workspace_uuid := COALESCE(NEW.workspace_id, OLD.workspace_id);
          user_uuid := COALESCE(NEW.created_by, OLD.created_by);
          entity_name := COALESCE(NEW.title, OLD.title);
          IF TG_OP = 'UPDATE' THEN
            changes_json := jsonb_build_object(
              'title', jsonb_build_object('old', OLD.title, 'new', NEW.title),
              'status', jsonb_build_object('old', OLD.status, 'new', NEW.status)
            );
          END IF;
        WHEN 'media_resources' THEN
          workspace_uuid := COALESCE(NEW.workspace_id, OLD.workspace_id);
          user_uuid := COALESCE(NEW.uploaded_by, OLD.uploaded_by);
          entity_name := COALESCE(NEW.title, OLD.title);
        WHEN 'themes' THEN
          workspace_uuid := COALESCE(NEW.workspace_id, OLD.workspace_id);
          user_uuid := COALESCE(NEW.created_by, OLD.created_by);
          entity_name := COALESCE(NEW.name, OLD.name);
        ELSE
          RETURN COALESCE(NEW, OLD);
      END CASE;
      
      -- Insert activity log
      INSERT INTO activity_logs (
        workspace_id,
        user_id,
        action,
        entity_type,
        entity_id,
        entity_name,
        description,
        changes,
        status
      ) VALUES (
        workspace_uuid,
        user_uuid,
        action_type,
        CASE TG_TABLE_NAME
          WHEN 'sermon_series' THEN 'series'
          ELSE TG_TABLE_NAME
        END,
        COALESCE(NEW.id, OLD.id),
        entity_name,
        CASE action_type
          WHEN 'create' THEN 'Created ' || TG_TABLE_NAME || ': ' || entity_name
          WHEN 'update' THEN 'Updated ' || TG_TABLE_NAME || ': ' || entity_name
          WHEN 'delete' THEN 'Deleted ' || TG_TABLE_NAME || ': ' || entity_name
        END,
        changes_json,
        'success'
      );
      
      RETURN COALESCE(NEW, OLD);
    END;
    $$ language 'plpgsql';
  `);

  // Create function to update sermon count in series
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_series_sermon_count()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' AND NEW.series_id IS NOT NULL THEN
        UPDATE sermon_series 
        SET actual_sermons = actual_sermons + 1
        WHERE id = NEW.series_id;
      ELSIF TG_OP = 'DELETE' AND OLD.series_id IS NOT NULL THEN
        UPDATE sermon_series 
        SET actual_sermons = GREATEST(0, actual_sermons - 1)
        WHERE id = OLD.series_id;
      ELSIF TG_OP = 'UPDATE' THEN
        -- Handle series change
        IF OLD.series_id IS DISTINCT FROM NEW.series_id THEN
          IF OLD.series_id IS NOT NULL THEN
            UPDATE sermon_series 
            SET actual_sermons = GREATEST(0, actual_sermons - 1)
            WHERE id = OLD.series_id;
          END IF;
          IF NEW.series_id IS NOT NULL THEN
            UPDATE sermon_series 
            SET actual_sermons = actual_sermons + 1
            WHERE id = NEW.series_id;
          END IF;
        END IF;
      END IF;
      
      RETURN COALESCE(NEW, OLD);
    END;
    $$ language 'plpgsql';
  `);

  // Create function to update theme usage count
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_theme_usage_count()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE themes 
        SET sermon_count = sermon_count + 1,
            last_used = CURRENT_TIMESTAMP
        WHERE id = NEW.theme_id;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE themes 
        SET sermon_count = GREATEST(0, sermon_count - 1)
        WHERE id = OLD.theme_id;
        
        -- Update last_used if this was the most recent usage
        UPDATE themes 
        SET last_used = (
          SELECT MAX(s.service_date)
          FROM sermons s
          JOIN sermon_themes st ON s.id = st.sermon_id
          WHERE st.theme_id = OLD.theme_id
        )
        WHERE id = OLD.theme_id;
      END IF;
      
      RETURN COALESCE(NEW, OLD);
    END;
    $$ language 'plpgsql';
  `);

  const tables = [
    'organizations', 'workspaces', 'users', 'themes', 
    'sermon_series', 'sermons', 'media_resources', 
    'collaborators', 'export_history'
  ];

  // Add updated_at triggers to all main tables
  for (const table of tables) {
    await knex.raw(`
      DROP TRIGGER IF EXISTS trigger_${table}_updated_at ON ${table};
      CREATE TRIGGER trigger_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  // Add activity logging triggers for key tables
  const activityTables = ['sermons', 'sermon_series', 'media_resources', 'themes'];
  for (const table of activityTables) {
    await knex.raw(`
      DROP TRIGGER IF EXISTS trigger_${table}_activity_log ON ${table};
      CREATE TRIGGER trigger_${table}_activity_log
        AFTER INSERT OR UPDATE OR DELETE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION log_activity();
    `);
  }

  // Add sermon count triggers
  await knex.raw(`
    DROP TRIGGER IF EXISTS trigger_sermons_update_series_count ON sermons;
    CREATE TRIGGER trigger_sermons_update_series_count
      AFTER INSERT OR UPDATE OR DELETE ON sermons
      FOR EACH ROW
      EXECUTE FUNCTION update_series_sermon_count();
  `);

  // Add theme usage count triggers
  await knex.raw(`
    DROP TRIGGER IF EXISTS trigger_sermon_themes_update_usage ON sermon_themes;
    CREATE TRIGGER trigger_sermon_themes_update_usage
      AFTER INSERT OR DELETE ON sermon_themes
      FOR EACH ROW
      EXECUTE FUNCTION update_theme_usage_count();
  `);

  // Create indexes for better performance on common queries
  await knex.raw(`
    -- Performance indexes for cross-table queries
    CREATE INDEX IF NOT EXISTS idx_sermons_workspace_speaker_date 
      ON sermons (workspace_id, speaker_id, service_date DESC);
    
    CREATE INDEX IF NOT EXISTS idx_sermons_series_number 
      ON sermons (series_id, sermon_number) WHERE series_id IS NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_activity_logs_recent 
      ON activity_logs (workspace_id, created_at DESC) WHERE created_at > CURRENT_DATE - INTERVAL '30 days';
    
    CREATE INDEX IF NOT EXISTS idx_media_resources_sermon_type 
      ON media_resources (sermon_id, resource_type) WHERE sermon_id IS NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_collaborators_active_workspace 
      ON collaborators (workspace_id, user_id) WHERE assignment_status = 'active';
    
    -- Partial indexes for common filtered queries
    CREATE INDEX IF NOT EXISTS idx_sermons_published_future 
      ON sermons (service_date, title) WHERE is_published = true AND service_date >= CURRENT_DATE;
    
    CREATE INDEX IF NOT EXISTS idx_series_active_current_year 
      ON sermon_series (workspace_id, start_date) 
      WHERE is_active = true AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    CREATE INDEX IF NOT EXISTS idx_export_history_pending_cleanup 
      ON export_history (file_expires_at) 
      WHERE status = 'completed' AND file_expires_at IS NOT NULL;
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  const tables = [
    'organizations', 'workspaces', 'users', 'themes', 
    'sermon_series', 'sermons', 'media_resources', 
    'collaborators', 'export_history'
  ];

  for (const table of tables) {
    await knex.raw(`DROP TRIGGER IF EXISTS trigger_${table}_updated_at ON ${table}`);
  }

  const activityTables = ['sermons', 'sermon_series', 'media_resources', 'themes'];
  for (const table of activityTables) {
    await knex.raw(`DROP TRIGGER IF EXISTS trigger_${table}_activity_log ON ${table}`);
  }

  await knex.raw(`DROP TRIGGER IF EXISTS trigger_sermons_update_series_count ON sermons`);
  await knex.raw(`DROP TRIGGER IF EXISTS trigger_sermon_themes_update_usage ON sermon_themes`);

  // Drop functions
  await knex.raw(`DROP FUNCTION IF EXISTS update_updated_at_column()`);
  await knex.raw(`DROP FUNCTION IF EXISTS log_activity()`);
  await knex.raw(`DROP FUNCTION IF EXISTS update_series_sermon_count()`);
  await knex.raw(`DROP FUNCTION IF EXISTS update_theme_usage_count()`);

  // Drop additional indexes
  await knex.raw(`
    DROP INDEX IF EXISTS idx_sermons_workspace_speaker_date;
    DROP INDEX IF EXISTS idx_sermons_series_number;
    DROP INDEX IF EXISTS idx_activity_logs_recent;
    DROP INDEX IF EXISTS idx_media_resources_sermon_type;
    DROP INDEX IF EXISTS idx_collaborators_active_workspace;
    DROP INDEX IF EXISTS idx_sermons_published_future;
    DROP INDEX IF EXISTS idx_series_active_current_year;
    DROP INDEX IF EXISTS idx_export_history_pending_cleanup;
  `);
}