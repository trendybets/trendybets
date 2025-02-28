import os
import pandas as pd
from supabase import create_client

# Supabase setup - using the same credentials from run_predictions.py
SUPABASE_URL = "https://hvegilvwwvdmivnphlyo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWdpbHZ3d3ZkbWl2bnBobHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NTY4MTQsImV4cCI6MjA1NTIzMjgxNH0.oXsosh4KtWAJDUTA_wjVa4nyGXf0krjyssCtpNXfdHQ"

# Player ID to check
TARGET_PLAYER_ID = "4B75CA28FA43"  # DeMar DeRozan
PLAYER_NAME = "DeMar DeRozan"

# Connect to Supabase
try:
    print(f"Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Connected successfully.")
except Exception as e:
    print(f"Connection error: {e}")
    exit(1)

# Function to check if a player ID exists
def check_player_id(player_id):
    print(f"\n==== Checking Player ID: {player_id} ====")
    
    # 1. Direct match search
    print("\nDirect exact match search:")
    try:
        response = supabase.table("player_history").select("*").eq("player_id", player_id).execute()
        rows = response.data
        print(f"  Found {len(rows)} rows with exact player_id '{player_id}'")
        if rows:
            print(f"  First row: {rows[0]}")
    except Exception as e:
        print(f"  Error in direct match search: {e}")
    
    # 2. Case insensitive search
    print("\nCase insensitive search:")
    try:
        response = supabase.table("player_history").select("*").ilike("player_id", player_id.lower()).execute()
        rows = response.data
        print(f"  Found {len(rows)} rows with player_id ILIKE '{player_id.lower()}'")
    except Exception as e:
        print(f"  Error in case insensitive search: {e}")
    
    # 3. Name-based search
    if PLAYER_NAME:
        print(f"\nSearching by player name: {PLAYER_NAME}")
        try:
            response = supabase.table("player_history").select("player_id").ilike("player_name", f"%{PLAYER_NAME}%").execute()
            rows = response.data
            unique_ids = set([row.get("player_id") for row in rows if row.get("player_id")])
            print(f"  Found {len(rows)} rows with {len(unique_ids)} unique player IDs matching name '{PLAYER_NAME}'")
            if unique_ids:
                print(f"  Player IDs: {unique_ids}")
        except Exception as e:
            print(f"  Error in name search: {e}")
    
    # 4. Check player_teams table
    print("\nChecking player_teams table:")
    try:
        response = supabase.table("player_teams").select("*").eq("player_id", player_id).execute()
        rows = response.data
        print(f"  Found {len(rows)} rows in player_teams with player_id '{player_id}'")
        if rows:
            print(f"  Sample: {rows[0]}")
    except Exception as e:
        print(f"  Error checking player_teams: {e}")

    print(f"\n==== End of checks for Player ID: {player_id} ====\n")

# Get a sample of player IDs to understand the format
print("\nSampling player IDs from database...")
try:
    response = supabase.table("player_history").select("player_id").limit(10).execute()
    sample_ids = [row.get("player_id") for row in response.data if row.get("player_id")]
    print(f"Sample player IDs: {sample_ids}")
except Exception as e:
    print(f"Error getting sample IDs: {e}")

# Check our target player
check_player_id(TARGET_PLAYER_ID)

# Try checking with different case
check_player_id(TARGET_PLAYER_ID.lower())

# Additional checks: look for player ID patterns
print("\nChecking for player ID patterns:")
try:
    response = supabase.table("player_history").select("player_id, count(*)").group("player_id").order("count", desc=True).limit(5).execute()
    print(f"Top 5 most common player IDs:")
    for row in response.data:
        print(f"  {row.get('player_id')}: {row.get('count')} records")
except Exception as e:
    print(f"Error checking ID patterns: {e}")

print("\nDebugging complete.") 