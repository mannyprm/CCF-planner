import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('media_resources', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign keys - flexible association
    table.uuid('workspace_id').notNullable()
      .references('id').inTable('workspaces')
      .onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('sermon_id').nullable()
      .references('id').inTable('sermons')
      .onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('series_id').nullable()
      .references('id').inTable('sermon_series')
      .onDelete('CASCADE').onUpdate('CASCADE');
    
    // Resource details
    table.string('title', 255).notNullable().comment('Resource title/name');
    table.text('description').nullable().comment('Resource description');
    table.enum('resource_type', [
      'outline', 'slides', 'audio', 'video', 'handout', 
      'scripture', 'research', 'image', 'document', 'link', 'other'
    ]).notNullable();
    
    // File information
    table.string('filename', 255).nullable().comment('Original filename');
    table.string('file_path', 500).nullable().comment('Storage path or URL');
    table.string('file_url', 500).nullable().comment('Public URL if applicable');
    table.bigInteger('file_size').nullable().comment('File size in bytes');
    table.string('mime_type', 100).nullable().comment('MIME type');
    table.string('file_hash', 64).nullable().comment('SHA-256 hash for integrity');
    
    // External link (for URL resources)
    table.string('external_url', 1000).nullable().comment('External URL if not a file');
    
    // Organization and metadata
    table.jsonb('tags').defaultTo('[]').comment('Array of tags for categorization');
    table.integer('display_order').notNullable().defaultTo(1).comment('Order within parent');
    table.boolean('is_public').notNullable().defaultTo(false).comment('Public visibility');
    table.boolean('is_downloadable').notNullable().defaultTo(true).comment('Allow downloads');
    
    // Access control
    table.enum('access_level', ['public', 'workspace', 'private'])
      .notNullable().defaultTo('workspace');
    table.jsonb('allowed_roles').defaultTo('["admin", "pastor", "volunteer"]')
      .comment('Array of roles allowed to access');
    
    // Usage tracking
    table.integer('download_count').notNullable().defaultTo(0);
    table.integer('view_count').notNullable().defaultTo(0);
    table.timestamp('last_accessed').nullable();
    
    // Version control
    table.string('version', 20).notNullable().defaultTo('1.0');
    table.uuid('parent_resource_id').nullable()
      .references('id').inTable('media_resources')
      .onDelete('SET NULL').onUpdate('CASCADE')
      .comment('Reference to parent resource for versioning');
    table.boolean('is_current_version').notNullable().defaultTo(true);
    
    // Processing status (for uploaded media)
    table.enum('processing_status', ['pending', 'processing', 'completed', 'failed'])
      .notNullable().defaultTo('completed');
    table.text('processing_error').nullable();
    table.jsonb('processing_metadata').defaultTo('{}')
      .comment('Metadata from processing (dimensions, duration, etc.)');
    
    // Storage information
    table.string('storage_provider', 50).notNullable().defaultTo('local')
      .comment('Storage provider (local, s3, gcs, etc.)');
    table.jsonb('storage_metadata').defaultTo('{}')
      .comment('Provider-specific metadata');
    
    // Metadata
    table.jsonb('metadata').defaultTo('{}').comment('Additional resource metadata');
    
    // Creator and timestamps
    table.uuid('uploaded_by').notNullable()
      .references('id').inTable('users')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    
    // Constraints
    table.check('file_size IS NULL OR file_size >= 0', 'chk_resources_non_negative_size');
    table.check('download_count >= 0', 'chk_resources_non_negative_downloads');
    table.check('view_count >= 0', 'chk_resources_non_negative_views');
    table.check('display_order > 0', 'chk_resources_positive_order');
    table.check(
      '(file_path IS NOT NULL) OR (external_url IS NOT NULL)',
      'chk_resources_has_location'
    );
    
    // Indexes
    table.index('workspace_id', 'idx_resources_workspace');
    table.index('sermon_id', 'idx_resources_sermon');
    table.index('series_id', 'idx_resources_series');
    table.index('resource_type', 'idx_resources_type');
    table.index('mime_type', 'idx_resources_mime');
    table.index('is_public', 'idx_resources_public');
    table.index('access_level', 'idx_resources_access');
    table.index('processing_status', 'idx_resources_processing');
    table.index('uploaded_by', 'idx_resources_uploader');
    table.index('file_hash', 'idx_resources_hash');
    table.index('parent_resource_id', 'idx_resources_parent');
    table.index(['is_current_version', 'parent_resource_id'], 'idx_resources_current_version');
    table.index('last_accessed', 'idx_resources_accessed');
    table.index(['workspace_id', 'resource_type'], 'idx_resources_workspace_type');
    
    // Full-text search index
    table.index(
      knex.raw(`to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || array_to_string(tags, ' '))`),
      'idx_resources_fulltext'
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('media_resources');
}