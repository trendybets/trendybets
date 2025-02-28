import pandas as pd
import numpy as np
import json
import os
from supabase import create_client
from datetime import datetime
import sys

# Supabase setup
SUPABASE_URL = "https://hvegilvwwvdmivnphlyo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWdpbHZ3d3ZkbWl2bnBobHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NTY4MTQsImV4cCI6MjA1NTIzMjgxNH0.oXsosh4KtWAJDUTA_wjVa4nyGXf0krjyssCtpNXfdHQ"

try:
    # Create a simple Supabase client without any extra options
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except TypeError as e:
    if 'proxy' in str(e):
        print("ERROR: Compatibility issue detected with Supabase client.")
        print("Please run: pip install supabase==1.2.0 gotrue==1.1.0")
        print("Then try running this script again.")
        sys.exit(1)
    else:
        print(f"ERROR: Unexpected error creating Supabase client: {e}")
        sys.exit(1)
except Exception as e:
    print(f"ERROR: Failed to connect to Supabase: {e}")
    sys.exit(1)

def test_database_connection():
    """Test the connection to the Supabase database."""
    try:
        # Attempt to query the database
        response = supabase.table("custom_projections").select("count(*)").execute()
        if not hasattr(response, 'data') or not response.data:
            print("Connected to Supabase, but unable to query custom_projections table.")
            print("The table may not exist yet. Try running setup_db.py first.")
            return False
            
        count = response.data[0]['count']
        print(f"Database connection successful. Found {count} existing projections.")
        return True
    except Exception as e:
        print(f"Database connection error: {e}")
        return False

def create_test_projections():
    """Create some test projections and save them to the database."""
    # Sample data for test projections
    test_projections = [
        {
            "player_id": "test_player_1",
            "player_name": "LeBron James (TEST)",
            "stat_type": "points",
            "line": 25.5,
            "projected_value": 28.7,
            "confidence": 75,
            "recommendation": "OVER",
            "edge": 3.2,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "metadata": {
                "source": "test_script",
                "notes": "This is a test projection"
            }
        },
        {
            "player_id": "test_player_1",
            "player_name": "LeBron James (TEST)",
            "stat_type": "assists",
            "line": 7.5,
            "projected_value": 6.3,
            "confidence": 65,
            "recommendation": "UNDER",
            "edge": -1.2,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "metadata": {
                "source": "test_script",
                "notes": "This is a test projection"
            }
        },
        {
            "player_id": "test_player_2",
            "player_name": "Stephen Curry (TEST)",
            "stat_type": "points",
            "line": 28.5,
            "projected_value": 31.2,
            "confidence": 80,
            "recommendation": "OVER",
            "edge": 2.7,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "metadata": {
                "source": "test_script",
                "notes": "This is a test projection"
            }
        }
    ]
    
    success_count = 0
    for proj in test_projections:
        try:
            # Convert metadata to JSON string for compatibility with some versions
            if 'metadata' in proj and isinstance(proj['metadata'], dict):
                proj['metadata'] = json.dumps(proj['metadata'])
                
            response = supabase.table("custom_projections").upsert(proj).execute()
            if hasattr(response, 'error') and response.error:
                print(f"Error saving test projection: {response.error}")
            else:
                success_count += 1
                print(f"Saved test projection for {proj['player_name']} - {proj['stat_type']}")
        except Exception as e:
            print(f"Error saving to Supabase: {e}")
    
    print(f"Successfully saved {success_count} out of {len(test_projections)} test projections")

def read_test_projections():
    """Fetch and display the test projections."""
    try:
        # For compatibility with older versions, use a simpler query approach
        response = supabase.table("custom_projections").select("*").execute()
        
        if hasattr(response, 'data'):
            # Filter locally if server-side filtering is problematic
            projections = [p for p in response.data if isinstance(p.get('metadata'), dict) and p.get('metadata', {}).get('source') == 'test_script']
            
            if projections:
                print(f"\nFound {len(projections)} test projections:")
                for proj in projections:
                    print(f"- {proj['player_name']}: {proj['stat_type']} {proj['recommendation']} {proj['line']} (Projected: {proj['projected_value']}, Confidence: {proj['confidence']}%)")
            else:
                print("No test projections found.")
        else:
            print("No data returned from query.")
    except Exception as e:
        print(f"Error reading from Supabase: {e}")

def cleanup_test_projections():
    """Remove the test projections from the database."""
    try:
        # For maximum compatibility, fetch all and delete by ID
        response = supabase.table("custom_projections").select("id,metadata").execute()
        
        if hasattr(response, 'data'):
            test_ids = []
            for proj in response.data:
                metadata = proj.get('metadata', {})
                if isinstance(metadata, dict) and metadata.get('source') == 'test_script':
                    test_ids.append(proj['id'])
                elif isinstance(metadata, str):
                    try:
                        metadata_dict = json.loads(metadata)
                        if metadata_dict.get('source') == 'test_script':
                            test_ids.append(proj['id'])
                    except:
                        pass
            
            if test_ids:
                for id in test_ids:
                    supabase.table("custom_projections").delete().eq('id', id).execute()
                print(f"Successfully deleted {len(test_ids)} test projections")
            else:
                print("No test projections found to delete.")
        else:
            print("No data returned from query.")
    except Exception as e:
        print(f"Error cleaning up test projections: {e}")

if __name__ == "__main__":
    print("NBA Betting Predictions Test Script")
    print("==================================")
    
    if test_database_connection():
        print("\nStep 1: Creating test projections...")
        create_test_projections()
        
        print("\nStep 2: Reading test projections...")
        read_test_projections()
        
        keep_test = input("\nWould you like to keep these test projections? (y/n): ").lower()
        if keep_test != 'y':
            print("\nStep 3: Cleaning up test projections...")
            cleanup_test_projections()
        else:
            print("\nKeeping test projections. You can view them in your projections table.")
    else:
        print("Cannot proceed with tests due to database connection error.") 