import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('export_history', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign keys
    table.uuid('workspace_id').notNullable()
      .references('id').inTable('workspaces')
      .onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('requested_by').notNullable()
      .references('id').inTable('users')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    
    // Export details
    table.string('export_name', 255).notNullable().comment('User-defined name for the export');
    table.enum('export_format', ['pdf', 'excel', 'ical', 'json', 'csv', 'docx'])
      .notNullable();
    table.enum('export_type', [
      'sermon_calendar', 'series_overview', 'resource_list', 
      'full_workspace', 'custom_query', 'single_sermon', 
      'single_series', 'analytics_report'
    ]).notNullable();
    
    // Export scope and filters
    table.date('date_range_start').nullable().comment('Start date for date-filtered exports');
    table.date('date_range_end').nullable().comment('End date for date-filtered exports');
    table.jsonb('included_series_ids').defaultTo('[]').comment('Array of series IDs to include');
    table.jsonb('included_sermon_ids').defaultTo('[]').comment('Array of sermon IDs to include');
    table.jsonb('filters').defaultTo('{}').comment('Additional filters applied to export');
    table.boolean('include_resources').notNullable().defaultTo(false);
    table.boolean('include_private_notes').notNullable().defaultTo(false);
    
    // Template and formatting
    table.string('template_name', 100).nullable().comment('Template used for export');
    table.jsonb('formatting_options').defaultTo('{}').comment('Formatting preferences');
    table.jsonb('custom_fields').defaultTo('[]').comment('Custom fields to include');
    
    // Processing status
    table.enum('status', ['pending', 'processing', 'completed', 'failed', 'expired'])
      .notNullable().defaultTo('pending');
    table.text('error_message').nullable();
    table.integer('progress_percentage').notNullable().defaultTo(0);
    table.timestamp('started_at').nullable();
    table.timestamp('completed_at').nullable();
    table.integer('processing_time_seconds').nullable();
    
    // File information
    table.string('file_path', 500).nullable().comment('Path to generated file');
    table.string('file_url', 500).nullable().comment('Temporary download URL');
    table.bigInteger('file_size_bytes').nullable();
    table.string('file_hash', 64).nullable().comment('SHA-256 hash of exported file');
    table.timestamp('file_expires_at').nullable().comment('When the file will be automatically deleted');
    
    // Statistics
    table.integer('total_records').nullable().comment('Number of records included in export');
    table.integer('download_count').notNullable().defaultTo(0);
    table.timestamp('last_downloaded').nullable();
    table.jsonb('download_log').defaultTo('[]').comment('Log of download events');
    
    // Sharing and access
    table.boolean('is_shareable').notNullable().defaultTo(false);
    table.string('share_token', 128).nullable().comment('Token for sharing export with others');
    table.timestamp('share_expires_at').nullable();
    table.jsonb('shared_with').defaultTo('[]').comment('Array of user IDs who have access');
    
    // Recurring exports
    table.boolean('is_recurring').notNullable().defaultTo(false);
    table.enum('recurrence_pattern', ['daily', 'weekly', 'monthly', 'quarterly'])
      .nullable();
    table.timestamp('next_run_at').nullable();
    table.timestamp('last_run_at').nullable();
    table.integer('run_count').notNullable().defaultTo(0);
    table.boolean('is_active_schedule').notNullable().defaultTo(false);
    
    // Metadata and configuration
    table.jsonb('export_config').defaultTo('{}').comment('Complete export configuration for reproduction');
    table.jsonb('metadata').defaultTo('{}').comment('Additional export metadata');
    table.text('notes').nullable().comment('User notes about this export');
    
    // Timestamps
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    
    // Constraints
    table.check('progress_percentage >= 0 AND progress_percentage <= 100', 'chk_export_history_valid_progress');
    table.check('file_size_bytes IS NULL OR file_size_bytes >= 0', 'chk_export_history_non_negative_size');
    table.check('total_records IS NULL OR total_records >= 0', 'chk_export_history_non_negative_records');
    table.check('download_count >= 0', 'chk_export_history_non_negative_downloads');
    table.check('run_count >= 0', 'chk_export_history_non_negative_runs');
    table.check(
      'date_range_start IS NULL OR date_range_end IS NULL OR date_range_end >= date_range_start',
      'chk_export_history_valid_date_range'
    );
    table.check(
      'completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at',
      'chk_export_history_valid_processing_times'
    );
    
    // Indexes
    table.index('workspace_id', 'idx_export_history_workspace');
    table.index('requested_by', 'idx_export_history_requester');
    table.index('export_format', 'idx_export_history_format');
    table.index('export_type', 'idx_export_history_type');
    table.index('status', 'idx_export_history_status');
    table.index('created_at', 'idx_export_history_created');
    table.index(['workspace_id', 'created_at'], 'idx_export_history_workspace_created');
    table.index(['requested_by', 'created_at'], 'idx_export_history_requester_created');
    table.index(['date_range_start', 'date_range_end'], 'idx_export_history_date_range');
    table.index('file_expires_at', 'idx_export_history_file_expires');
    table.index('share_token', 'idx_export_history_share_token');
    table.index('is_recurring', 'idx_export_history_recurring');
    table.index('next_run_at', 'idx_export_history_next_run');
    table.index('is_active_schedule', 'idx_export_history_active_schedule');
    table.index('last_downloaded', 'idx_export_history_last_download');
    
    // Composite indexes for common queries
    table.index(['workspace_id', 'status', 'created_at'], 'idx_export_history_workspace_status_created');
    table.index(['is_recurring', 'next_run_at'], 'idx_export_history_recurring_schedule');
    table.index(['status', 'file_expires_at'], 'idx_export_history_cleanup');
    
    // Full-text search index
    table.index(
      knex.raw(`to_tsvector('english', export_name || ' ' || COALESCE(notes, ''))`),
      'idx_export_history_fulltext'
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('export_history');
}