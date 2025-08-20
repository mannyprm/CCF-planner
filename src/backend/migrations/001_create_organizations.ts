import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('organizations', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Organization details
    table.string('name', 255).notNullable().comment('Organization/Church name');
    table.text('description').nullable().comment('Organization description');
    table.string('subdomain', 100).unique().notNullable().comment('Unique subdomain for the organization');
    
    // Contact information
    table.string('primary_email', 255).nullable();
    table.string('phone', 50).nullable();
    table.string('website', 255).nullable();
    
    // Address information
    table.jsonb('address').nullable().comment('Address object with street, city, state, zip, country');
    
    // Organization settings
    table.jsonb('settings').notNullable().defaultTo('{}').comment('Organization-wide settings and preferences');
    
    // Subscription and status
    table.enum('subscription_tier', ['free', 'basic', 'premium', 'enterprise'])
      .notNullable().defaultTo('free');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('trial_ends_at').nullable();
    
    // Billing information
    table.string('stripe_customer_id').nullable();
    table.string('stripe_subscription_id').nullable();
    
    // Metadata
    table.jsonb('metadata').defaultTo('{}').comment('Additional organization metadata');
    
    // Timestamps
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    
    // Indexes
    table.index('subdomain', 'idx_organizations_subdomain');
    table.index('is_active', 'idx_organizations_active');
    table.index('subscription_tier', 'idx_organizations_tier');
    table.index('created_at', 'idx_organizations_created');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('organizations');
}