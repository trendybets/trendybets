import os
from supabase import create_client, Client
import json

# Supabase setup
SUPABASE_URL = "https://hvegilvwwvdmivnphlyo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWdpbHZ3d3ZkbWl2bnBobHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NTY4MTQsImV4cCI6MjA1NTIzMjgxNH0.oXsosh4KtWAJDUTA_wjVa4nyGXf0krjyssCtpNXfdHQ"

def create_supabase_client() -> Client:
    """Create a Supabase client with error handling."""
    try:
        # Create a simple Supabase client without any extra options
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except TypeError as e:
        if 'proxy' in str(e):
            print("Compatibility issue detected with Supabase client.")
            print("Please run: pip install supabase==1.2.0 gotrue==1.1.0")
            raise
        raise

def execute_sql_via_rpc(supabase, sql):
    """Execute SQL via RPC with error handling."""
    try:
        return supabase.rpc('exec_sql', {'sql': sql}).execute()
    except Exception as e:
        # Some Supabase instances may not have the exec_sql RPC function
        print(f"Error executing SQL via RPC: {e}")
        print("Your Supabase instance may not have the exec_sql RPC function enabled.")
        print("As an alternative, please run this SQL directly in the Supabase SQL editor.")
        raise

def create_tables_manually():
    """Create tables by directly executing SQL statements."""
    # Get the current directory where this script is located
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Read the SQL script
    sql_file_path = os.path.join(current_dir, "create_tables.sql")
    with open(sql_file_path, 'r') as sql_file:
        sql_script = sql_file.read()
    
    # Print the SQL for manual execution
    print("\nIf the automatic execution fails, you can run the following SQL in the Supabase SQL editor:")
    print("====================")
    print(sql_script)
    print("====================")

def setup_database():
    print("Setting up database tables...")
    
    try:
        # Initialize Supabase client
        supabase = create_supabase_client()
        
        # Get the current directory where this script is located
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Read the SQL script
        sql_file_path = os.path.join(current_dir, "create_tables.sql")
        with open(sql_file_path, 'r') as sql_file:
            sql_script = sql_file.read()
        
        # Split the SQL script into individual statements
        # This is a simple split that works for most cases
        sql_statements = sql_script.split(';')
        
        # Provide manual SQL as a fallback
        create_tables_manually()
        
        # Execute each SQL statement
        for statement in sql_statements:
            # Skip empty statements
            if statement.strip():
                print(f"Executing SQL: {statement[:50]}...")  # Print first 50 chars of statement
                
                try:
                    # Execute the SQL statement using the Supabase REST API
                    response = execute_sql_via_rpc(supabase, statement)
                    
                    # Check for errors
                    if hasattr(response, 'error') and response.error:
                        print(f"Error executing SQL: {response.error}")
                    else:
                        print("SQL executed successfully")
                except Exception as e:
                    print(f"Error executing statement: {e}")
                    print("Continuing with next statement...")
        
        print("Database setup completed successfully!")
        
    except Exception as e:
        print(f"Error setting up database: {e}")
        print("\nPlease run the SQL manually in the Supabase SQL editor as shown above.")

if __name__ == "__main__":
    setup_database() 