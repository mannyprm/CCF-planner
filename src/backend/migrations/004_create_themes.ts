import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('themes', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign keys
    table.uuid('workspace_id').notNullable()
      .references('id').inTable('workspaces')
      .onDelete('CASCADE').onUpdate('CASCADE');
    
    // Theme details
    table.string('name', 255).notNullable().comment('Theme name (e.g., "Faith", "Hope", "Love")');
    table.text('description').nullable().comment('Detailed description of the theme');
    table.text('theme_scripture').nullable().comment('Primary scripture reference for theme');
    table.string('color', 7).notNullable().defaultTo('#3B82F6').comment('Hex color code for theme');
    table.string('icon', 50).nullable().comment('Icon identifier for theme');
    
    // Planning and organization
    table.integer('display_order').notNullable().defaultTo(1).comment('Order for displaying themes');
    table.boolean('is_active').notNullable().defaultTo(true);
    
    // Date associations (flexible for different planning approaches)
    table.jsonb('associated_months').defaultTo('[]').comment('Array of month numbers (1-12) when theme is emphasized');
    table.jsonb('associated_seasons').defaultTo('[]').comment('Array of seasons (advent, lent, easter, etc.)');
    
    // Content and resources
    table.jsonb('key_concepts').defaultTo('[]').comment('Array of key concepts/words for this theme');
    table.jsonb('scripture_references').defaultTo('[]').comment('Array of supporting scripture references');
    table.jsonb('suggested_topics').defaultTo('[]').comment('Array of suggested sermon topics');
    table.text('notes').nullable().comment('Additional notes about the theme');
    
    // Usage tracking
    table.integer('sermon_count').notNullable().defaultTo(0).comment('Number of sermons using this theme');
    table.timestamp('last_used').nullable().comment('Last time this theme was used in a sermon');
    
    // Metadata
    table.jsonb('metadata').defaultTo('{}').comment('Additional theme metadata');
    
    // Creator and timestamps
    table.uuid('created_by').notNullable()
      .references('id').inTable('users')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    
    // Constraints
    table.check('display_order > 0', 'chk_themes_positive_order');
    table.check('sermon_count >= 0', 'chk_themes_non_negative_count');
    
    // Unique constraint for theme names within workspace
    table.unique(['workspace_id', 'name'], 'unq_themes_workspace_name');
    
    // Indexes
    table.index('workspace_id', 'idx_themes_workspace');
    table.index(['workspace_id', 'display_order'], 'idx_themes_workspace_order');
    table.index('is_active', 'idx_themes_active');
    table.index('created_by', 'idx_themes_creator');
    table.index('last_used', 'idx_themes_last_used');
    table.index('sermon_count', 'idx_themes_usage');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('themes');
}