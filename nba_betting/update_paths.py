import os
import re
import sys

def update_paths_in_file(file_path, old_base_path, new_base_path):
    """
    Updates all occurrences of old_base_path to new_base_path in the given file
    """
    # Read the file
    with open(file_path, 'r') as file:
        content = file.read()
    
    # Replace paths
    updated_content = content.replace(old_base_path, new_base_path)
    
    if content == updated_content:
        print(f"No changes needed in {file_path}")
        return 0
    
    # Write back to the file
    with open(file_path, 'w') as file:
        file.write(updated_content)
    
    # Count replacements
    replacements = content.count(old_base_path)
    print(f"Updated {replacements} paths in {file_path}")
    return replacements

def main():
    # Current directory is the NBA betting directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Old path that needs to be replaced
    old_base_path = '/Users/claytucker/nba_betting'
    
    # New path should be the absolute path to the NBA betting directory
    new_base_path = script_dir
    
    print(f"Updating paths from {old_base_path} to {new_base_path}")
    
    # Files to update
    py_files = [
        'nba_prop_predictor_with_optic.py',
        'nba_prop_trainer.py',
        'run_predictions.py'
    ]
    
    total_replacements = 0
    
    for py_file in py_files:
        file_path = os.path.join(script_dir, py_file)
        if os.path.exists(file_path):
            total_replacements += update_paths_in_file(file_path, old_base_path, new_base_path)
        else:
            print(f"Warning: File {file_path} not found")
    
    print(f"Completed with {total_replacements} total path replacements")

if __name__ == "__main__":
    main() 