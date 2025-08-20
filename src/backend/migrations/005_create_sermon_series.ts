import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('sermon_series', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign keys
    table.uuid('workspace_id').notNullable()
      .references('id').inTable('workspaces')
      .onDelete('CASCADE').onUpdate('CASCADE');
    
    // Series details
    table.string('title', 255).notNullable().comment('Series title');
    table.text('description').nullable().comment('Detailed description of the series');
    table.text('theme_scripture').nullable().comment('Primary scripture for the entire series');
    table.string('series_image', 500).nullable().comment('URL to series artwork/image');
    table.string('color_theme', 7).notNullable().defaultTo('#3B82F6').comment('Hex color for series branding');
    
    // Date range
    table.date('start_date').notNullable().comment('Series start date');
    table.date('end_date').nullable().comment('Series end date (null for ongoing)');
    
    // Series classification
    table.enum('series_type', ['expository', 'topical', 'narrative', 'seasonal', 'special', 'guest', 'other'])
      .notNullable().defaultTo('topical');
    table.string('target_audience', 100).nullable().comment('Primary audience (adults, youth, families, etc.)');
    
    // Planning and organization
    table.integer('estimated_sermons').notNullable().defaultTo(1).comment('Planned number of sermons');
    table.integer('actual_sermons').notNullable().defaultTo(0).comment('Current number of sermons in series');
    table.integer('display_order').notNullable().defaultTo(1).comment('Order within the year');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('is_published').notNullable().defaultTo(false).comment('Public visibility');
    table.timestamp('published_at').nullable();
    
    // Tags and categorization
    table.jsonb('tags').defaultTo('[]').comment('Array of tags for categorization');
    table.jsonb('topics').defaultTo('[]').comment('Array of main topics covered');
    table.jsonb('scripture_books').defaultTo('[]').comment('Array of Bible books covered');
    
    // Resources and materials
    table.jsonb('resources').defaultTo('[]').comment('Array of resource links and references');
    table.text('notes').nullable().comment('Planning notes and ideas');
    table.text('goals').nullable().comment('Learning objectives and goals');
    
    // Status tracking
    table.enum('status', ['planning', 'in_progress', 'completed', 'archived'])
      .notNullable().defaultTo('planning');
    table.jsonb('completion_status').defaultTo(JSON.stringify({
      outline_complete: false,
      resources_gathered: false,
      artwork_ready: false,
      promotion_ready: false
    })).comment('Series preparation checklist');
    
    // Metadata
    table.jsonb('metadata').defaultTo('{}').comment('Additional series metadata');
    
    // Creator and timestamps
    table.uuid('created_by').notNullable()
      .references('id').inTable('users')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    
    // Constraints
    table.check('estimated_sermons > 0', 'chk_series_positive_estimated');
    table.check('actual_sermons >= 0', 'chk_series_non_negative_actual');
    table.check('display_order > 0', 'chk_series_positive_order');
    
    // Indexes
    table.index('workspace_id', 'idx_series_workspace');
    table.index(['workspace_id', 'start_date'], 'idx_series_workspace_start');
    table.index(['start_date', 'end_date'], 'idx_series_date_range');
    table.index('series_type', 'idx_series_type');
    table.index('status', 'idx_series_status');
    table.index('is_active', 'idx_series_active');
    table.index('is_published', 'idx_series_published');
    table.index('created_by', 'idx_series_creator');
    table.index('display_order', 'idx_series_order');
    
    // Full-text search index on title and description
    table.index(knex.raw('to_tsvector(\'english\', title || \' \' || COALESCE(description, \'\'))'), 'idx_series_fulltext');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('sermon_series');
}