import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Firebase integration
    table.string('firebase_uid', 128).unique().notNullable().comment('Firebase Authentication UID');
    
    // Foreign keys
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations')
      .onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('default_workspace_id').nullable()
      .references('id').inTable('workspaces')
      .onDelete('SET NULL').onUpdate('CASCADE');
    
    // User profile
    table.string('email', 255).unique().notNullable();
    table.string('display_name', 255).notNullable();
    table.string('first_name', 100).nullable();
    table.string('last_name', 100).nullable();
    table.string('profile_picture', 500).nullable().comment('URL to profile picture');
    table.string('phone', 50).nullable();
    table.string('title', 100).nullable().comment('Job title or role in church');
    
    // Role and permissions
    table.enum('role', ['admin', 'pastor', 'volunteer', 'viewer'])
      .notNullable().defaultTo('viewer');
    table.jsonb('permissions').defaultTo('[]').comment('Additional granular permissions');
    
    // User preferences
    table.jsonb('preferences').notNullable().defaultTo(JSON.stringify({
      theme: 'system',
      notifications: {
        email: true,
        push: true,
        sermon_reminders: true,
        deadline_alerts: true
      },
      timezone: 'America/New_York',
      language: 'en'
    })).comment('User preferences and settings');
    
    // Status and access
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('email_verified').notNullable().defaultTo(false);
    table.boolean('is_guest_speaker').notNullable().defaultTo(false);
    
    // Authentication tracking
    table.timestamp('last_login').nullable();
    table.timestamp('last_activity').nullable();
    table.string('last_ip', 45).nullable().comment('Last known IP address');
    table.jsonb('login_history').defaultTo('[]').comment('Recent login history');
    
    // Metadata
    table.jsonb('metadata').defaultTo('{}').comment('Additional user metadata');
    
    // Timestamps
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    
    // Indexes
    table.index('firebase_uid', 'idx_users_firebase_uid');
    table.index('email', 'idx_users_email');
    table.index('organization_id', 'idx_users_organization');
    table.index('default_workspace_id', 'idx_users_workspace');
    table.index(['organization_id', 'role'], 'idx_users_org_role');
    table.index('is_active', 'idx_users_active');
    table.index('last_login', 'idx_users_last_login');
    table.index('created_at', 'idx_users_created');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('users');
}