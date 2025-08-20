import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('sermon_themes', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign keys
    table.uuid('sermon_id').notNullable()
      .references('id').inTable('sermons')
      .onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('theme_id').notNullable()
      .references('id').inTable('themes')
      .onDelete('CASCADE').onUpdate('CASCADE');
    
    // Relationship details
    table.boolean('is_primary_theme').notNullable().defaultTo(false)
      .comment('Whether this is the primary theme for the sermon');
    table.integer('relevance_score').nullable()
      .comment('1-10 score of how relevant this theme is to the sermon');
    table.text('connection_notes').nullable()
      .comment('Notes on how this theme connects to the sermon');
    
    // Timestamps
    table.timestamps(true, true);
    
    // Unique constraint to prevent duplicate associations
    table.unique(['sermon_id', 'theme_id'], 'unq_sermon_themes_sermon_theme');
    
    // Constraints
    table.check('relevance_score IS NULL OR (relevance_score >= 1 AND relevance_score <= 10)', 'chk_sermon_themes_valid_score');
    
    // Indexes
    table.index('sermon_id', 'idx_sermon_themes_sermon');
    table.index('theme_id', 'idx_sermon_themes_theme');
    table.index('is_primary_theme', 'idx_sermon_themes_primary');
    table.index('relevance_score', 'idx_sermon_themes_score');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('sermon_themes');
}