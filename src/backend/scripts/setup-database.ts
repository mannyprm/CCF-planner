#!/usr/bin/env ts-node

import knex from 'knex';
import config from '../knexfile';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../../.env' });

const environment = process.env.NODE_ENV || 'development';
const db = knex(config[environment]);

async function setupDatabase() {
  console.log('🚀 Starting CCF Sermon Planning Database Setup...\n');
  
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    await db.raw('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Check if PostgreSQL extensions are available
    console.log('🔧 Checking PostgreSQL extensions...');
    try {
      await db.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await db.raw('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
      console.log('✅ PostgreSQL extensions ready\n');
    } catch (error) {
      console.log('⚠️  Could not create extensions (may require superuser privileges)');
      console.log('   Extensions will be created automatically if available\n');
    }

    // Run migrations
    console.log('📋 Running database migrations...');
    const [batchNo, migrationList] = await db.migrate.latest();
    
    if (migrationList.length === 0) {
      console.log('✅ Database is up to date\n');
    } else {
      console.log(`✅ Batch ${batchNo} migrations completed:`);
      migrationList.forEach((migration: string) => {
        console.log(`   • ${migration}`);
      });
      console.log('');
    }

    // Check if we should run seeds
    const shouldSeed = process.argv.includes('--seed') || process.argv.includes('-s');
    
    if (shouldSeed) {
      console.log('🌱 Running database seeds...');
      await db.seed.run();
      console.log('✅ Database seeded with sample data\n');
    }

    // Verify database structure
    console.log('🔍 Verifying database structure...');
    const tables = [
      'organizations', 'workspaces', 'users', 'themes',
      'sermon_series', 'sermons', 'media_resources',
      'collaborators', 'activity_logs', 'export_history',
      'sermon_themes', 'series_themes'
    ];

    const existingTables = await db('information_schema.tables')
      .where('table_schema', 'public')
      .pluck('table_name');

    const missingTables = tables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log('✅ All required tables exist');
      console.log(`📊 Database contains ${existingTables.length} tables\n`);
    } else {
      console.log('❌ Missing tables:');
      missingTables.forEach(table => console.log(`   • ${table}`));
      console.log('');
    }

    // Show table statistics
    console.log('📈 Table Statistics:');
    for (const table of tables) {
      if (existingTables.includes(table)) {
        const count = await db(table).count('* as count').first();
        console.log(`   • ${table}: ${count?.count || 0} records`);
      }
    }
    console.log('');

    // Verify indexes
    console.log('🔍 Checking critical indexes...');
    const criticalIndexes = await db.raw(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND (
          indexname LIKE '%workspace%' OR
          indexname LIKE '%sermon%' OR
          indexname LIKE '%fulltext%' OR
          indexname LIKE '%firebase%'
        )
      ORDER BY tablename, indexname
    `);
    
    console.log(`✅ Found ${criticalIndexes.rows.length} critical indexes`);
    
    // Verify triggers
    console.log('🔍 Checking database triggers...');
    const triggers = await db.raw(`
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `);
    
    console.log(`✅ Found ${triggers.rows.length} triggers`);
    console.log('');

    // Show sample workspace if exists
    if (shouldSeed) {
      const workspace = await db('workspaces')
        .select('name', 'planning_year', 'church_name')
        .first();
      
      if (workspace) {
        console.log('🏢 Sample Workspace Created:');
        console.log(`   • Name: ${workspace.name}`);
        console.log(`   • Church: ${workspace.church_name}`);
        console.log(`   • Year: ${workspace.planning_year}`);
        console.log('');
      }
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Update your .env file with the correct DATABASE_URL');
    console.log('   2. Configure Firebase Authentication settings');
    console.log('   3. Set up file storage for media resources');
    console.log('   4. Start the development server: npm run dev');
    console.log('');

    if (!shouldSeed) {
      console.log('💡 To populate with sample data, run:');
      console.log('   npm run setup:db -- --seed');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Ensure PostgreSQL is running');
    console.log('   2. Check database connection details in .env');
    console.log('   3. Verify database user has necessary permissions');
    console.log('   4. Check if the database exists');
    console.log('');
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Handle command line arguments
if (require.main === module) {
  setupDatabase().catch(console.error);
}

export default setupDatabase;