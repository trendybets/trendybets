// This script applies the profiles table migration to your Supabase database
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in .env.local file');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Create Supabase client with service role key (admin privileges)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '../supabase/manual_migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration to create profiles table...');
    
    // Execute the SQL using the Supabase REST API
    const { error } = await supabase.rpc('pgrest_exec', { query: sql });
    
    if (error) {
      console.error('Error applying migration:', error.message);
      process.exit(1);
    }
    
    console.log('Migration applied successfully!');
    console.log('The profiles table has been created with the necessary triggers and policies.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

applyMigration(); 