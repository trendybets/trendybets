#!/bin/bash

# Get the Supabase URL and service key from environment variables
SUPABASE_URL=${SUPABASE_URL:-$NEXT_PUBLIC_SUPABASE_URL}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY:-$SUPABASE_SERVICE_ROLE_KEY}

# Check if the required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set"
  exit 1
fi

# Ensure the URL has the https:// protocol
if [[ ! "$SUPABASE_URL" =~ ^https?:// ]]; then
  SUPABASE_URL="https://$SUPABASE_URL"
fi

# Path to the migration file
MIGRATION_FILE="supabase/migrations/20240523000000_add_updated_at_to_fixtures_completed.sql"

# Check if the migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Error: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

# Read the migration SQL
MIGRATION_SQL=$(cat "$MIGRATION_FILE")

# Apply the migration using the REST API
echo "Applying migration to add updated_at column to fixtures_completed table..."
curl -X POST \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$MIGRATION_SQL\"}" \
  "$SUPABASE_URL/rest/v1/rpc/execute_sql"

# Check the exit status
if [ $? -eq 0 ]; then
  echo "Migration applied successfully!"
else
  echo "Error applying migration"
  exit 1
fi 