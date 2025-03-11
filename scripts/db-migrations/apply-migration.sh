#!/bin/bash

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
else
  echo "Error: .env.local file not found"
  exit 1
fi

# Check if required environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: Missing Supabase credentials in .env.local file"
  echo "Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set"
  exit 1
fi

# Extract project reference from URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's/https:\/\/([^.]+).supabase.co/\1/')

echo "Applying migration to create profiles table..."

# Read the SQL file
SQL_CONTENT=$(cat supabase/manual_migration.sql)

# Use curl to execute the SQL via the Supabase REST API
curl -X POST \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/pgrest_exec" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo $SQL_CONTENT | jq -Rs .)}"

if [ $? -eq 0 ]; then
  echo "Migration applied successfully!"
  echo "The profiles table has been created with the necessary triggers and policies."
else
  echo "Error applying migration"
  exit 1
fi 