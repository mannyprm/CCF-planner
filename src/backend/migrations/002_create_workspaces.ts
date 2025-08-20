import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('workspaces', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign keys
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations')
      .onDelete('CASCADE').onUpdate('CASCADE');
    
    // Workspace details
    table.string('name', 255).notNullable().comment('Workspace name (e.g., "2024 Sermon Planning")');
    table.text('description').nullable();
    table.string('church_name', 255).notNullable().comment('Church name for this workspace');
    
    // Planning period
    table.integer('planning_year').notNullable().comment('Year this workspace covers');
    table.date('start_date').notNullable().comment('Planning period start date');
    table.date('end_date').notNullable().comment('Planning period end date');
    
    // Address (can override organization address)
    table.jsonb('address').nullable().comment('Church address object');
    
    // Workspace settings
    table.jsonb('settings').notNullable().defaultTo(JSON.stringify({
      time_zone: 'America/New_York',
      default_service_time: '11:00',
      advance_planning_weeks: 12,
      sermon_length_minutes: 30,
      allow_guest_speakers: true,
      require_approval: false,
      branding: {
        primary_color: '#3B82F6',
        secondary_color: '#EF4444'
      }
    })).comment('Workspace-specific settings');
    
    // Status and access
    table.enum('subscription_tier', ['free', 'basic', 'premium'])
      .notNullable().defaultTo('free');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('is_template').notNullable().defaultTo(false).comment('Template workspace for copying');
    
    // Metadata
    table.jsonb('metadata').defaultTo('{}').comment('Additional workspace metadata');
    
    // Creator and timestamps
    table.uuid('created_by').notNullable().comment('User ID who created this workspace');
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    
    // Constraints
    table.check('end_date > start_date', 'chk_workspaces_valid_date_range');
    table.check('advance_planning_weeks > 0', 'chk_workspaces_positive_planning_weeks');
    table.check('sermon_length_minutes > 0', 'chk_workspaces_positive_sermon_length');
    
    // Indexes
    table.index('organization_id', 'idx_workspaces_organization');
    table.index(['organization_id', 'planning_year'], 'idx_workspaces_org_year');
    table.index('is_active', 'idx_workspaces_active');
    table.index('planning_year', 'idx_workspaces_year');
    table.index(['start_date', 'end_date'], 'idx_workspaces_date_range');
    table.index('created_by', 'idx_workspaces_creator');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('workspaces');
}