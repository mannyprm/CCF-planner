import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('collaborators', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign keys - flexible collaboration model
    table.uuid('workspace_id').notNullable()
      .references('id').inTable('workspaces')
      .onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('user_id').notNullable()
      .references('id').inTable('users')
      .onDelete('CASCADE').onUpdate('CASCADE');
    
    // Optional associations (collaborator can be assigned to specific items)
    table.uuid('sermon_id').nullable()
      .references('id').inTable('sermons')
      .onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('series_id').nullable()
      .references('id').inTable('sermon_series')
      .onDelete('CASCADE').onUpdate('CASCADE');
    
    // Collaboration details
    table.enum('role', [
      'owner', 'editor', 'contributor', 'reviewer', 'viewer'
    ]).notNullable().defaultTo('contributor')
      .comment('Role within the collaboration context');
    
    table.enum('collaboration_type', [
      'workspace_member', 'sermon_collaborator', 'series_collaborator', 
      'guest_contributor', 'reviewer'
    ]).notNullable().defaultTo('workspace_member');
    
    // Permissions
    table.jsonb('permissions').defaultTo(JSON.stringify({
      can_view: true,
      can_edit: false,
      can_delete: false,
      can_publish: false,
      can_invite: false,
      can_manage_resources: false,
      can_export: true
    })).comment('Specific permissions for this collaboration');
    
    // Assignment details
    table.string('assignment_title', 255).nullable()
      .comment('Specific assignment or task title');
    table.text('assignment_description').nullable()
      .comment('Description of collaboration role/responsibilities');
    table.date('assignment_start_date').nullable();
    table.date('assignment_end_date').nullable();
    table.enum('assignment_status', [
      'active', 'pending', 'completed', 'suspended', 'expired'
    ]).notNullable().defaultTo('active');
    
    // Communication preferences
    table.jsonb('notification_preferences').defaultTo(JSON.stringify({
      email_updates: true,
      deadline_reminders: true,
      status_changes: true,
      new_assignments: true,
      frequency: 'immediate'
    })).comment('How user wants to be notified about this collaboration');
    
    // Invitation and access
    table.boolean('is_accepted').notNullable().defaultTo(true)
      .comment('Whether user has accepted the collaboration invitation');
    table.timestamp('invited_at').nullable();
    table.timestamp('accepted_at').nullable();
    table.string('invitation_token', 128).nullable()
      .comment('Token for invitation acceptance');
    table.timestamp('invitation_expires_at').nullable();
    
    // Activity tracking
    table.timestamp('last_activity').nullable();
    table.jsonb('activity_summary').defaultTo('{}')
      .comment('Summary of user activity in this collaboration');
    table.integer('contribution_count').notNullable().defaultTo(0)
      .comment('Number of contributions made');
    
    // Metadata
    table.jsonb('metadata').defaultTo('{}').comment('Additional collaboration metadata');
    
    // Creator and timestamps
    table.uuid('invited_by').notNullable()
      .references('id').inTable('users')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    
    // Constraints
    table.check('contribution_count >= 0', 'chk_collaborators_non_negative_contributions');
    table.check(
      'assignment_start_date IS NULL OR assignment_end_date IS NULL OR assignment_end_date >= assignment_start_date',
      'chk_collaborators_valid_assignment_dates'
    );
    table.check(
      'invitation_expires_at IS NULL OR invitation_expires_at > invited_at',
      'chk_collaborators_valid_invitation_expiry'
    );
    
    // Unique constraints
    table.unique(['workspace_id', 'user_id'], 'unq_collaborators_workspace_user');
    table.unique(['sermon_id', 'user_id'], 'unq_collaborators_sermon_user');
    table.unique(['series_id', 'user_id'], 'unq_collaborators_series_user');
    table.unique('invitation_token', 'unq_collaborators_invitation_token');
    
    // Indexes
    table.index('workspace_id', 'idx_collaborators_workspace');
    table.index('user_id', 'idx_collaborators_user');
    table.index('sermon_id', 'idx_collaborators_sermon');
    table.index('series_id', 'idx_collaborators_series');
    table.index(['workspace_id', 'role'], 'idx_collaborators_workspace_role');
    table.index('collaboration_type', 'idx_collaborators_type');
    table.index('assignment_status', 'idx_collaborators_status');
    table.index('is_accepted', 'idx_collaborators_accepted');
    table.index('invited_by', 'idx_collaborators_inviter');
    table.index('last_activity', 'idx_collaborators_activity');
    table.index('invitation_token', 'idx_collaborators_token');
    table.index(['assignment_start_date', 'assignment_end_date'], 'idx_collaborators_assignment_dates');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('collaborators');
}