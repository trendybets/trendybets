#!/usr/bin/env python3
import os
import sys
import subprocess
import importlib.util
import time

def check_installed(package):
    """Check if a package is installed."""
    spec = importlib.util.find_spec(package)
    return spec is not None

def install_package(package):
    """Install a package using pip."""
    print(f"Installing {package}...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

def setup_environment():
    """Set up the Python environment with required packages."""
    print("Setting up Python environment...")
    
    # Check if the requirements file exists
    script_dir = os.path.dirname(os.path.abspath(__file__))
    requirements_path = os.path.join(script_dir, "requirements.txt")
    
    # First install supabase and gotrue directly to ensure compatibility
    try:
        print("Installing compatible versions of supabase and gotrue...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "supabase==1.2.0", "gotrue==1.1.0"])
        print("Supabase and GoTrue installed successfully.")
    except Exception as e:
        print(f"Warning: Error installing Supabase directly: {e}")
    
    if os.path.exists(requirements_path):
        print(f"Installing other packages from {requirements_path}...")
        try:
            # Skip supabase and gotrue since we already installed them
            with open(requirements_path, 'r') as f:
                requirements = f.read().splitlines()
            
            filtered_requirements = [r for r in requirements if not r.startswith('supabase') and not r.startswith('gotrue')]
            
            if filtered_requirements:
                # Create a temporary file with filtered requirements
                temp_req_path = os.path.join(script_dir, "temp_requirements.txt")
                with open(temp_req_path, 'w') as f:
                    f.write('\n'.join(filtered_requirements))
                
                # Install the filtered requirements
                subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", temp_req_path])
                
                # Clean up temporary file
                if os.path.exists(temp_req_path):
                    os.remove(temp_req_path)
        except Exception as e:
            print(f"Warning: Error installing packages from requirements.txt: {e}")
            print("Continuing with essential packages...")
            
    # Install essential packages individually as a fallback
    essential_packages = ['pandas', 'numpy', 'requests', 'python-dotenv']
    for package in essential_packages:
        if not check_installed(package):
            try:
                install_package(package)
            except Exception as e:
                print(f"Warning: Failed to install {package}: {e}")

def update_file_paths():
    """Run the update_paths.py script to fix hardcoded paths."""
    print("Updating file paths...")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    update_paths_script = os.path.join(script_dir, "update_paths.py")
    
    if os.path.exists(update_paths_script):
        try:
            subprocess.check_call([sys.executable, update_paths_script])
        except Exception as e:
            print(f"Warning: Error updating file paths: {e}")
            print("You may need to update any hardcoded paths manually.")
    else:
        print("Warning: update_paths.py not found, skipping path updates.")

def setup_database():
    """Set up the database tables."""
    print("Setting up database tables...")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_setup_script = os.path.join(script_dir, "setup_db.py")
    
    if os.path.exists(db_setup_script):
        try:
            subprocess.check_call([sys.executable, db_setup_script])
            return True
        except Exception as e:
            print(f"Warning: Error setting up database: {e}")
            print("You may need to run the SQL manually in the Supabase SQL editor.")
            
            # Show the SQL script for manual execution
            sql_path = os.path.join(script_dir, "create_tables.sql")
            if os.path.exists(sql_path):
                print("\nHere's the SQL you can run manually:")
                print("====================================")
                with open(sql_path, 'r') as f:
                    print(f.read())
                print("====================================")
    else:
        print("Error: setup_db.py not found. Database setup failed.")
    
    return False

def test_system():
    """Test the system by running the test script."""
    print("Testing the system...")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    test_script = os.path.join(script_dir, "test_predictions.py")
    
    if os.path.exists(test_script):
        try:
            subprocess.check_call([sys.executable, test_script])
        except Exception as e:
            print(f"Warning: Error testing the system: {e}")
            print("You may need to verify the database connection manually.")
    else:
        print("Warning: test_predictions.py not found, skipping system test.")

def verify_installation():
    """Verify key components are installed correctly."""
    print("\nVerifying installation...")
    
    # Check supabase and gotrue versions
    try:
        import pkg_resources
        supabase_version = pkg_resources.get_distribution("supabase").version
        gotrue_version = pkg_resources.get_distribution("gotrue").version
        
        print(f"Installed supabase version: {supabase_version}")
        print(f"Installed gotrue version: {gotrue_version}")
        
        if supabase_version != "1.2.0" or gotrue_version != "1.1.0":
            print("Warning: You have versions that may not be compatible.")
            print("Recommended: supabase==1.2.0 and gotrue==1.1.0")
    except Exception as e:
        print(f"Warning: Unable to verify package versions: {e}")
    
    # Try importing supabase
    try:
        from supabase import create_client
        print("✓ Supabase client can be imported")
    except Exception as e:
        print(f"✗ Error importing supabase: {e}")

def main():
    print("NBA Betting System Setup")
    print("=======================")
    
    try:
        # Step 1: Set up Python environment
        setup_environment()
        
        # Give the system some time to register the new packages
        time.sleep(1)
        
        # Step 2: Update file paths
        update_file_paths()
        
        # Step 3: Set up database
        setup_database()
        
        # Step 4: Verify installation
        verify_installation()
        
        # Step 5: Test the system
        test_system()
        
        print("\nSetup process completed!")
        print("\nNext steps:")
        print("1. Verify that predictions appear in the projections table")
        print("2. Run the prediction system using:")
        print("   - Web UI: Navigate to the Run Predictions page")
        print("   - Command line: python run_predictions.py")
        print("3. For more information, see the DATABASE_SETUP.md file")
        
    except Exception as e:
        print(f"Setup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 