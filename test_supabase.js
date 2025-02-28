const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with the service role key from run_predictions.py
const SUPABASE_URL = 'https://hvegilvwwvdmivnphlyo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWdpbHZ3d3ZkbWl2bnBobHlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTY1NjgxNCwiZXhwIjoyMDU1MjMyODE0fQ.6GV2B4ciNiMGOnnRXOMznwD1aNqYUQmHxuuWrdc3U44';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkCustomProjections() {
  try {
    // Count the records
    const { count, error: countError } = await supabase
      .from('custom_projections')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting records:', countError);
      return;
    }

    console.log('Total records in custom_projections:', count);

    // Get a sample of the records
    const { data, error } = await supabase
      .from('custom_projections')
      .select('*')
      .limit(5);

    if (error) {
      console.error('Error fetching records:', error);
      return;
    }

    console.log('Sample records from custom_projections:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCustomProjections(); 