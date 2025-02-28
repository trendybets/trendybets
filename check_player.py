import os
from supabase.client import create_client

# Initialize Supabase client
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')
supabase = create_client(url, key)

# Define test player ID
test_id = '4B75CA28FA43'  # DeMar DeRozan

# Query the player_history table
print(f"Querying for player ID: {test_id}")
result = supabase.table('player_history').select('*').eq('player_id', test_id).execute()

# Print results
print(f"Found {len(result.data)} rows for player ID {test_id}")

if result.data:
    print(f"Sample row: {result.data[0]}")
    
# Get a sample of player IDs to see format
sample_result = supabase.table('player_history').select('player_id').limit(5).execute()
print(f"Sample player IDs: {[item['player_id'] for item in sample_result.data]}")

# Try case insensitive search
print("\nTrying case insensitive search...")
lower_id = test_id.lower()
result_lower = supabase.table('player_history').select('*').ilike('player_id', lower_id).execute()
print(f"Found {len(result_lower.data)} rows with player_id ILIKE '{lower_id}'") 