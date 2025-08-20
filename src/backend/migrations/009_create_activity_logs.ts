import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('activity_logs', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign keys
    table.uuid('workspace_id').notNullable()
      .references('id').inTable('workspaces')
      .onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('user_id').nullable()
      .references('id').inTable('users')
      .onDelete('SET NULL').onUpdate('CASCADE');
    
    // Activity details
    table.enum('action', [
      'create', 'update', 'delete', 'view', 'download', 'export',
      'invite', 'accept_invitation', 'login', 'logout', 'upload',
      'publish', 'unpublish', 'archive', 'restore', 'share',
      'comment', 'approve', 'reject', 'assign', 'complete'
    ]).notNullable().comment('Type of action performed');
    
    table.enum('entity_type', [
      'workspace', 'user', 'sermon', 'series', 'theme', 'resource',
      'collaborator', 'export', 'comment', 'assignment', 'notification'
    ]).notNullable().comment('Type of entity affected');
    
    table.uuid('entity_id').nullable().comment('ID of the affected entity');
    table.string('entity_name', 255).nullable().comment('Name/title of the affected entity');
    
    // Activity context
    table.text('description').notNullable().comment('Human-readable description of the action');
    table.jsonb('changes').defaultTo('{}').comment('Details of what changed (before/after)');
    table.jsonb('metadata').defaultTo('{}').comment('Additional context and metadata');
    
    // Request information
    table.string('ip_address', 45).nullable().comment('IP address of the user');
    table.string('user_agent', 500).nullable().comment('User agent string');
    table.string('session_id', 128).nullable().comment('Session identifier');
    table.string('request_id', 128).nullable().comment('Unique request identifier for tracing');
    
    // Outcome and status
    table.enum('status', ['success', 'failed', 'warning'])
      .notNullable().defaultTo('success');
    table.text('error_message').nullable().comment('Error details if action failed');
    table.integer('execution_time_ms').nullable().comment('Time taken to execute action');
    
    // Impact and importance
    table.enum('severity', ['low', 'medium', 'high', 'critical'])
      .notNullable().defaultTo('low');
    table.boolean('is_sensitive').notNullable().defaultTo(false)
      .comment('Whether this action involves sensitive data');
    table.boolean('requires_audit').notNullable().defaultTo(false)
      .comment('Whether this action requires special audit attention');
    
    // Related entities (for complex operations)
    table.jsonb('related_entities').defaultTo('[]')
      .comment('Array of related entity references');
    table.uuid('parent_activity_id').nullable()
      .references('id').inTable('activity_logs')
      .onDelete('SET NULL').onUpdate('CASCADE')
      .comment('Parent activity for grouped operations');
    
    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    
    // Retention and archival
    table.timestamp('expires_at').nullable()
      .comment('When this log entry should be archived/deleted');
    table.boolean('is_archived').notNullable().defaultTo(false);
    
    // Constraints
    table.check('execution_time_ms IS NULL OR execution_time_ms >= 0', 'chk_activity_logs_non_negative_time');
    
    // Indexes
    table.index('workspace_id', 'idx_activity_logs_workspace');
    table.index('user_id', 'idx_activity_logs_user');
    table.index(['entity_type', 'entity_id'], 'idx_activity_logs_entity');
    table.index('action', 'idx_activity_logs_action');
    table.index('created_at', 'idx_activity_logs_created');
    table.index(['workspace_id', 'created_at'], 'idx_activity_logs_workspace_time');
    table.index(['user_id', 'created_at'], 'idx_activity_logs_user_time');
    table.index('status', 'idx_activity_logs_status');
    table.index('severity', 'idx_activity_logs_severity');
    table.index('requires_audit', 'idx_activity_logs_audit');
    table.index('is_sensitive', 'idx_activity_logs_sensitive');
    table.index('parent_activity_id', 'idx_activity_logs_parent');
    table.index('session_id', 'idx_activity_logs_session');
    table.index('request_id', 'idx_activity_logs_request');
    table.index('expires_at', 'idx_activity_logs_expires');
    table.index('is_archived', 'idx_activity_logs_archived');
    
    // Composite indexes for common queries
    table.index(['workspace_id', 'action', 'created_at'], 'idx_activity_logs_workspace_action_time');
    table.index(['entity_type', 'action', 'created_at'], 'idx_activity_logs_entity_action_time');
    table.index(['user_id', 'action', 'created_at'], 'idx_activity_logs_user_action_time');
    
    // Full-text search index
    table.index(
      knex.raw(`to_tsvector('english', description || ' ' || COALESCE(entity_name, ''))`),
      'idx_activity_logs_fulltext'
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('activity_logs');
}