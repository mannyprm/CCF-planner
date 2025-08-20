import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('series_themes', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign keys
    table.uuid('series_id').notNullable()
      .references('id').inTable('sermon_series')
      .onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('theme_id').notNullable()
      .references('id').inTable('themes')
      .onDelete('CASCADE').onUpdate('CASCADE');
    
    // Relationship details
    table.boolean('is_primary_theme').notNullable().defaultTo(false)
      .comment('Whether this is the primary theme for the series');
    table.integer('emphasis_level').nullable()
      .comment('1-5 level of emphasis this theme receives in the series');
    table.text('series_connection').nullable()
      .comment('How this theme is woven throughout the series');
    
    // Timestamps
    table.timestamps(true, true);
    
    // Unique constraint to prevent duplicate associations
    table.unique(['series_id', 'theme_id'], 'unq_series_themes_series_theme');
    
    // Constraints
    table.check('emphasis_level IS NULL OR (emphasis_level >= 1 AND emphasis_level <= 5)', 'chk_series_themes_valid_emphasis');
    
    // Indexes
    table.index('series_id', 'idx_series_themes_series');
    table.index('theme_id', 'idx_series_themes_theme');
    table.index('is_primary_theme', 'idx_series_themes_primary');
    table.index('emphasis_level', 'idx_series_themes_emphasis');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('series_themes');
}