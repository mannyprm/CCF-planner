import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('sermons', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign keys
    table.uuid('workspace_id').notNullable()
      .references('id').inTable('workspaces')
      .onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('series_id').nullable()
      .references('id').inTable('sermon_series')
      .onDelete('SET NULL').onUpdate('CASCADE');
    table.uuid('speaker_id').notNullable()
      .references('id').inTable('users')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    
    // Sermon details
    table.string('title', 255).notNullable().comment('Sermon title');
    table.string('subtitle', 255).nullable().comment('Optional subtitle');
    table.text('description').nullable().comment('Sermon description/summary');
    table.integer('sermon_number').nullable().comment('Number within series (1, 2, 3, etc.)');
    
    // Service information
    table.date('service_date').notNullable().comment('Date of service');
    table.time('service_time').notNullable().defaultTo('11:00').comment('Service start time');
    table.integer('duration_minutes').notNullable().defaultTo(30).comment('Planned sermon duration');
    table.enum('sermon_type', [
      'sunday_morning', 'sunday_evening', 'wednesday', 
      'special_event', 'guest_speaker', 'series', 'standalone'
    ]).notNullable().defaultTo('sunday_morning');
    
    // Scripture and content
    table.jsonb('scripture_references').defaultTo('[]').comment('Array of scripture reference objects');
    table.text('main_scripture').nullable().comment('Primary scripture text');
    table.jsonb('main_points').defaultTo('[]').comment('Array of main sermon points');
    table.text('sermon_outline').nullable().comment('Detailed sermon outline');
    table.text('introduction').nullable().comment('Sermon introduction notes');
    table.text('conclusion').nullable().comment('Sermon conclusion notes');
    table.text('call_to_action').nullable().comment('Closing call to action');
    
    // Target and context
    table.string('target_audience', 100).nullable().comment('Primary audience');
    table.jsonb('tags').defaultTo('[]').comment('Array of topical tags');
    table.text('context_notes').nullable().comment('Cultural/historical context notes');
    table.text('application_notes').nullable().comment('Modern application notes');
    
    // Preparation status
    table.enum('status', ['planning', 'in_preparation', 'ready', 'delivered', 'archived'])
      .notNullable().defaultTo('planning');
    table.jsonb('preparation_status').defaultTo(JSON.stringify({
      outline_complete: false,
      research_complete: false,
      slides_complete: false,
      notes_complete: false,
      practice_complete: false,
      last_updated: null
    })).comment('Preparation checklist');
    
    // Publishing and visibility
    table.boolean('is_published').notNullable().defaultTo(false);
    table.timestamp('published_at').nullable();
    table.boolean('is_guest_speaker').notNullable().defaultTo(false);
    table.string('guest_speaker_name', 255).nullable();
    table.string('guest_speaker_bio', 1000).nullable();
    
    // Content and notes
    table.text('speaker_notes').nullable().comment('Private notes for speaker');
    table.text('tech_notes').nullable().comment('Technical requirements and notes');
    table.text('music_notes').nullable().comment('Music and worship notes');
    table.text('follow_up_notes').nullable().comment('Post-sermon follow-up ideas');
    
    // Metadata and tracking
    table.jsonb('metadata').defaultTo('{}').comment('Additional sermon metadata');
    table.integer('view_count').notNullable().defaultTo(0).comment('Number of views/accesses');
    table.timestamp('last_viewed').nullable();
    
    // Creator and timestamps
    table.uuid('created_by').notNullable()
      .references('id').inTable('users')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    
    // Constraints
    table.check('duration_minutes > 0', 'chk_sermons_positive_duration');
    table.check('sermon_number IS NULL OR sermon_number > 0', 'chk_sermons_positive_number');
    table.check('view_count >= 0', 'chk_sermons_non_negative_views');
    
    // Unique constraint for sermon number within series
    table.unique(['series_id', 'sermon_number'], 'unq_sermons_series_number');
    
    // Indexes
    table.index('workspace_id', 'idx_sermons_workspace');
    table.index('series_id', 'idx_sermons_series');
    table.index('speaker_id', 'idx_sermons_speaker');
    table.index(['workspace_id', 'service_date'], 'idx_sermons_workspace_date');
    table.index('service_date', 'idx_sermons_date');
    table.index(['service_date', 'service_time'], 'idx_sermons_datetime');
    table.index('status', 'idx_sermons_status');
    table.index('sermon_type', 'idx_sermons_type');
    table.index('is_published', 'idx_sermons_published');
    table.index('is_guest_speaker', 'idx_sermons_guest');
    table.index('created_by', 'idx_sermons_creator');
    table.index('last_viewed', 'idx_sermons_viewed');
    
    // Full-text search index
    table.index(
      knex.raw(`to_tsvector('english', title || ' ' || COALESCE(subtitle, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(main_scripture, ''))`), 
      'idx_sermons_fulltext'
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('sermons');
}