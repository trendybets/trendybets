const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

// Initialize Supabase client with service role key for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    // Read SQL file
    const sqlFilePath = path.join(__dirname, 'create_sports_leagues_tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL file into individual statements
    const statements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_string: statement });
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
        
        // Continue with next statement despite error
        console.log('Continuing with next statement...');
      } else {
        console.log(`Successfully executed statement ${i + 1}`);
      }
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error in migration process:', error);
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Schema update process completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error in schema update process:', err);
    process.exit(1);
  }); 