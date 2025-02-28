import pandas as pd
import numpy as np
import json
import requests
import os
import sys
from supabase import create_client
from datetime import datetime
import argparse

# Supabase setup
SUPABASE_URL = "https://hvegilvwwvdmivnphlyo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWdpbHZ3d3ZkbWl2bnBobHlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTY1NjgxNCwiZXhwIjoyMDU1MjMyODE0fQ.6GV2B4ciNiMGOnnRXOMznwD1aNqYUQmHxuuWrdc3U44"

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

# Set up paths relative to the project directory
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)  # Go up one level to project root

# Construct path for best_params.json
best_params_path = os.path.join(current_dir, "best_params.json")

# Parse arguments
parser = argparse.ArgumentParser(description='Run NBA prop predictions and save to Supabase')
parser.add_argument('--fixture_id', type=str, help='Optional fixture ID to run predictions for a specific game', required=False)
parser.add_argument('--refresh_data', action='store_true', help='Force refresh of all data before predictions')
parser.add_argument('--dry_run', action='store_true', help="Don't save to database, just print predictions")
parser.add_argument('--debug_player', type=str, help='Print debug information for a specific player ID', required=False)
args = parser.parse_args()

print("Fetching data from Supabase tables...")

# Fetch data from Supabase tables instead of CSV files
def fetch_player_history():
    try:
        all_data = []
        # Use pagination to get all records
        page = 0
        page_size = 1000
        total_fetched = 0
        
        while True:
            print(f"\nFetching player_history records batch {page} (page size {page_size})...")
            response = supabase.table("player_history").select("*").range(page * page_size, (page + 1) * page_size - 1).execute()
            if not hasattr(response, 'data') or len(response.data) == 0:
                print(f"No more data. Total records fetched: {total_fetched}")
                break
                
            batch_size = len(response.data)
            total_fetched += batch_size
            print(f"Received {batch_size} records (total so far: {total_fetched})")
            
            # Print the ENTIRE response for inspection    
            print(f"FULL RESPONSE DATA (first 1 item):")
            if response.data and len(response.data) > 0:
                print(json.dumps(response.data[0], indent=2))
            else:
                print("No data in response")
                
            # Debug specific player ID
            test_id = "4B75CA28FA43"
            matches = [d for d in response.data if d.get('player_id') == test_id]
            print(f"DEBUG: Found {len(matches)} matches for player ID {test_id} in response batch {page}")
            if matches:
                print(f"Sample match: {matches[0]}")
                
            all_data.extend(response.data)
            page += 1
            
            # Force continue to next page even if received less than page_size
            # This ensures we get ALL data
            
        if not all_data:
            raise Exception("No data returned")
            
        df = pd.DataFrame(all_data)
        
        # Debug specific player ID in dataframe
        test_id = "4B75CA28FA43"
        matches_df = df[df['player_id'] == test_id]
        print(f"DEBUG: Found {len(matches_df)} matches for player ID {test_id} in final dataframe")
        if len(matches_df) > 0:
            print(f"Sample match from DataFrame: {matches_df.iloc[0].to_dict()}")
        
        # Print ALL unique player IDs in the dataframe
        unique_ids = df['player_id'].unique()
        print(f"Total unique player IDs in DataFrame: {len(unique_ids)}")
        print(f"First 10 player IDs: {unique_ids[:10]}")
        
        # Check for player IDs case-insensitively
        upper_unique_ids = [pid.upper() for pid in unique_ids]
        if test_id.upper() in upper_unique_ids:
            idx = upper_unique_ids.index(test_id.upper())
            original_case_id = unique_ids[idx]
            print(f"Found player ID with different case: '{original_case_id}' (matches '{test_id}')")
            matches_case_insensitive = df[df['player_id'] == original_case_id]
            print(f"Found {len(matches_case_insensitive)} rows with case-insensitive match")
        
        # Convert start_date to datetime
        if 'start_date' in df.columns:
            df['start_date'] = pd.to_datetime(df['start_date'])
        return df
    except Exception as e:
        print(f"Failed to fetch player_history data: {e}")
        print("Make sure the player_history table exists in your Supabase database.")
        sys.exit(1)

def fetch_fixtures():
    try:
        all_data = []
        # Use pagination to get all records
        page = 0
        page_size = 1000
        total_fetched = 0
        
        while True:
            print(f"\nFetching fixtures records batch {page} (page size {page_size})...")
            response = supabase.table("fixtures_completed").select("*").range(page * page_size, (page + 1) * page_size - 1).execute()
            if not hasattr(response, 'data') or len(response.data) == 0:
                print(f"No more data. Total fixtures fetched: {total_fetched}")
                break
                
            batch_size = len(response.data)
            total_fetched += batch_size
            print(f"Received {batch_size} fixture records (total so far: {total_fetched})")
                
            all_data.extend(response.data)
            page += 1
            
            # Force continue to next page even if received less than page_size
            # This ensures we get ALL data
        
        if not all_data:
            raise Exception("No data returned")
            
        df = pd.DataFrame(all_data)
        # Convert start_date to datetime
        if 'start_date' in df.columns:
            df['start_date'] = pd.to_datetime(df['start_date'])
        return df
    except Exception as e:
        print(f"Failed to fetch fixtures_completed data: {e}")
        print("Make sure the fixtures_completed table exists in your Supabase database.")
        sys.exit(1)

def fetch_player_teams():
    try:
        all_data = []
        # Use pagination to get all records
        page = 0
        page_size = 1000
        total_fetched = 0
        
        while True:
            print(f"\nFetching player_teams records batch {page} (page size {page_size})...")
            response = supabase.table("player_teams").select("*").range(page * page_size, (page + 1) * page_size - 1).execute()
            if not hasattr(response, 'data') or len(response.data) == 0:
                print(f"No more data. Total player_teams records fetched: {total_fetched}")
                break
                
            batch_size = len(response.data)
            total_fetched += batch_size
            print(f"Received {batch_size} player_teams records (total so far: {total_fetched})")
                
            all_data.extend(response.data)
            page += 1
            
            # Force continue to next page even if received less than page_size
            # This ensures we get ALL data
        
        if not all_data:
            raise Exception("No data returned")
            
        return pd.DataFrame(all_data)
    except Exception as e:
        print(f"Failed to fetch player_teams data: {e}")
        print("Make sure the player_teams table exists in your Supabase database.")
        sys.exit(1)

# Load data from Supabase
print("Loading player_history data...")
player_history = fetch_player_history()
print(f"Loaded {len(player_history)} player history records")

print("Loading fixtures data...")
fixtures = fetch_fixtures()
print(f"Loaded {len(fixtures)} fixtures")

print("Loading player_teams data...")
player_teams = fetch_player_teams()
print(f"Loaded {len(player_teams)} player team mappings")

# Merge player teams data
player_history = player_history.merge(player_teams[['player_id', 'game_id', 'team_id']], on=['player_id', 'game_id'])

# Debug specific player ID after merge
test_id = "4B75CA28FA43"
matches_after_merge = player_history[player_history['player_id'] == test_id]
print(f"DEBUG: Found {len(matches_after_merge)} matches for player ID {test_id} after merging with player_teams")
if len(matches_after_merge) == 0:
    # Check if player exists in player_teams
    matches_in_teams = player_teams[player_teams['player_id'] == test_id]
    print(f"DEBUG: Found {len(matches_in_teams)} matches for player ID {test_id} in player_teams table")

# Load best parameters
with open(best_params_path, 'r') as f:
    all_params = json.load(f)

# Prepare team win percentages
team_game = []
for _, row in fixtures.iterrows():
    try:
        # Handle both string and already parsed JSON
        home_competitors = row['home_competitors']
        away_competitors = row['away_competitors']
        
        # If it's a string, try to parse it
        if isinstance(home_competitors, str):
            home_team = eval(home_competitors)[0]['id']
        else:
            # If it's already a list or dict, use it directly
            home_team = home_competitors[0]['id']
            
        if isinstance(away_competitors, str):
            away_team = eval(away_competitors)[0]['id']
        else:
            away_team = away_competitors[0]['id']
            
        if pd.notna(row.get('home_score_total')) and pd.notna(row.get('away_score_total')):
            won = row['home_score_total'] > row['away_score_total']
            team_game.extend([
                {'team_id': home_team, 'game_id': row['game_id'], 'start_date': row['start_date'], 'is_home': True, 'won': won},
                {'team_id': away_team, 'game_id': row['game_id'], 'start_date': row['start_date'], 'is_home': False, 'won': not won}
            ])
    except Exception as e:
        print(f"Error processing fixture {row.get('game_id', 'unknown')}: {e}")
        continue
team_game = pd.DataFrame(team_game)
team_game = team_game.sort_values(['team_id', 'start_date'])
team_game['cum_games_before'] = team_game.groupby('team_id').cumcount()
team_game['cum_wins_before'] = team_game.groupby('team_id')['won'].cumsum().shift(1, fill_value=0)
team_game['win_percentage_before'] = team_game['cum_wins_before'] / team_game['cum_games_before'].replace(0, 1)
team_game['win_percentage_before'] = team_game['win_percentage_before'].fillna(0.5)

# Merge to fixtures
fixtures['home_team_id'] = fixtures['home_competitors'].apply(lambda x: 
    eval(x)[0]['id'] if isinstance(x, str) else x[0]['id'])
fixtures['away_team_id'] = fixtures['away_competitors'].apply(lambda x: 
    eval(x)[0]['id'] if isinstance(x, str) else x[0]['id'])
fixtures = fixtures.merge(
    team_game[team_game['is_home']][['game_id', 'win_percentage_before']],
    on='game_id', how='left'
).rename(columns={'win_percentage_before': 'home_team_win_percentage_before'})
fixtures = fixtures.merge(
    team_game[~team_game['is_home']][['game_id', 'win_percentage_before']],
    on='game_id', how='left'
).rename(columns={'win_percentage_before': 'away_team_win_percentage_before'})
latest_wins = team_game.groupby('team_id')['win_percentage_before'].last()
fixtures['home_team_win_percentage_before'] = fixtures['home_team_win_percentage_before'].fillna(fixtures['home_team_id'].map(latest_wins)).fillna(0.5)
fixtures['away_team_win_percentage_before'] = fixtures['away_team_win_percentage_before'].fillna(fixtures['away_team_id'].map(latest_wins)).fillna(0.5)

# Enrich player history
player_history = player_history.merge(
    fixtures[['game_id', 'home_team_id', 'away_team_id', 'home_team_win_percentage_before', 'away_team_win_percentage_before']],
    on='game_id', how='left'
)
player_history['is_home'] = player_history['team_id'] == player_history['home_team_id']
player_history['opponent_win_percentage_before'] = player_history.apply(
    lambda row: row['away_team_win_percentage_before'] if pd.notna(row['is_home']) and row['is_home'] else row['home_team_win_percentage_before'], axis=1
)
player_history['is_home'] = player_history['is_home'].fillna(False)
player_history['opponent_win_percentage_before'] = player_history['opponent_win_percentage_before'].fillna(0.5)

# Fetch Optic Odds prop lines
def fetch_optic_odds(fixture_id):
    print(f"Fetching odds for fixture: {fixture_id}")
    # Use the exact endpoint format that we confirmed works
    endpoint = f"https://api.opticodds.com/api/v3/fixtures/odds?sportsbook=draftkings&fixture_id={fixture_id}&market=player%20points&market=player%20assists&market=player%20rebounds&is_main=true&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
    try:
        response = requests.get(endpoint)
        response.raise_for_status()
        
        # Print response structure for debugging
        response_json = response.json()
        print(f"API Response status code: {response.status_code}")
        print(f"API Response contains data: {bool(response_json.get('data'))}")
        
        if not response_json.get('data') or len(response_json['data']) == 0:
            print(f"No data returned for fixture ID {fixture_id}")
            return None, {}, {}
            
        data = response_json['data'][0]
        game_id = data.get('game_id')
        odds = data.get('odds', [])
        
        print(f"Game ID found: {game_id}")
        print(f"Number of odds found: {len(odds)}")
        
        if not game_id:
            print(f"No game_id found in response for fixture ID {fixture_id}")
            return None, {}, {}
            
        if not odds or len(odds) == 0:
            print(f"No odds available for fixture ID {fixture_id}")
            return game_id, {}, {}
        
        player_lines = {}
        player_names = {}
        
        for odd in odds:
            try:
                player_id = odd.get('player_id')
                # Updated to use 'selection' instead of 'player_name'
                player_name = odd.get('selection', f"Unknown Player ({player_id})")
                market = odd.get('market', '')
                points = odd.get('points')
                
                if not player_id or not market or points is None:
                    continue
                    
                stat = market.replace('Player ', '').lower().replace('rebounds', 'total_rebounds')
                
                if player_id not in player_lines:
                    player_lines[player_id] = {}
                    player_names[player_id] = player_name
                    
                player_lines[player_id][stat] = points
            except Exception as e:
                print(f"Error processing odd: {e}")
                continue
        
        print(f"Found lines for {len(player_lines)} players")
        if not player_lines:
            print(f"No valid player lines found for fixture ID {fixture_id}")
            
        return game_id, player_lines, player_names
        
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error fetching Optic Odds: {e}")
        # Save the error response for debugging
        try:
            print(f"Error response: {e.response.text}")
        except:
            pass
        return None, {}, {}
    except Exception as e:
        print(f"Error fetching Optic Odds: {e}")
        print("Try another fixture ID or check if the Optic Odds API is available.")
        return None, {}, {}

# Prediction function
def predict_player_stat(player_id, game_id, stat, all_params):
    if stat not in all_params:
        return f"No trained parameters for {stat}"
    N = all_params[stat]['N']
    decay_factor = all_params[stat]['decay_factor']
    home_advantage = all_params[stat]['home_advantage']
    opponent_weight = all_params[stat].get('opponent_weight', 1.0)
    
    player_games = player_history[player_history['player_id'] == player_id].sort_values('start_date')
    target_game = fixtures[fixtures['game_id'] == game_id].iloc[0]
    past_games = player_games[player_games['start_date'] < target_game['start_date']].tail(N)
    
    if len(past_games) == 0:
        return f"No past data for {player_id}"
    if len(past_games) < N:
        print(f"Warning: Only {len(past_games)} past games for {player_id}, less than N={N}")
    if stat not in player_games.columns:
        return f"Statistic {stat} not available"
    
    positions = range(len(past_games))
    recency_weights = pd.Series([decay_factor ** i for i in reversed(positions)], index=past_games.index)
    opp_win_pct = past_games['opponent_win_percentage_before'].fillna(0.5)
    home_factor = past_games['is_home'].apply(lambda x: 1 + home_advantage if x else 1 - home_advantage)
    
    weights = recency_weights * opp_win_pct * opponent_weight * home_factor
    
    if weights.isna().any():
        return f"NaN in weights for {player_id}"
    if weights.sum() == 0 or np.isnan(weights.sum()):
        return f"Weights sum to zero or NaN for {player_id}"
    pred = (past_games[stat] * weights).sum() / weights.sum()
    
    # Use try/except for robustness but keep the same formula
    try:
        is_home = player_history[player_history['player_id'] == player_id]['team_id'].iloc[0] == target_game['home_team_id']
    except Exception as e:
        print(f"Error determining home/away: {e}")
        is_home = False
    
    opponent_win_pct = target_game['away_team_win_percentage_before'] if is_home else target_game['home_team_win_percentage_before']
    home_adjust = 1 + home_advantage if is_home else 1 - home_advantage
    
    if pd.isna(pred) or pd.isna(opponent_win_pct):
        return f"NaN in final prediction for {player_id}"
    
    # Use exact formula without rounding to match original model
    final_pred = pred * home_adjust
    
    return final_pred

# Function to save prediction to Supabase
def save_prediction_to_supabase(player_id, player_name, stat_type, line, predicted_value, confidence, recommendation, edge, db_client=None):
    # Calculate metadata
    metadata = {
        "model_version": "v1.2",
        "source": "nba_prop_predictor"
    }
    
    # Print the data being saved for debugging
    print(f"Saving prediction to Supabase:")
    print(f"  player_id: {player_id}")
    print(f"  player_name: {player_name}")
    print(f"  stat_type: {stat_type}")
    print(f"  line: {line}")
    print(f"  predicted_value: {predicted_value}")
    print(f"  confidence: {confidence}")
    print(f"  recommendation: {recommendation}")
    print(f"  edge: {edge}")
    
    try:
        # Use the provided db_client, or the global supabase client
        client = db_client or supabase
        
        # Use execute() to get both data and error
        response = client.table('custom_projections').upsert({
            "player_id": player_id,
            "player_name": player_name,
            "stat_type": stat_type,
            "line": line,
            "projected_value": predicted_value,
            "confidence": confidence,
            "recommendation": recommendation,
            "edge": edge,
            "metadata": metadata
        }).execute()
        
        # Log the full response
        print(f"Supabase response data: {response.data}")
        print(f"Supabase response error: {response.error}")
        
        if response.error:
            print(f"Error saving to Supabase: {response.error}")
            return False
            
        print(f"Successfully saved prediction for {player_name} - {stat_type}")
        return True
    except Exception as e:
        print(f"Exception saving to Supabase: {e}")
        print(f"Error type: {type(e)}")
        if hasattr(e, 'response'):
            print(f"Response details: {e.response}")
        return False

def process_fixture(fixture_id):
    global fixtures
    game_id, optic_lines, player_names = fetch_optic_odds(fixture_id)
    
    if not game_id or not optic_lines:
        print(f"No data available for fixture ID {fixture_id}")
        return 0
    
    # Check if game exists in fixtures, add if not
    if game_id not in fixtures['game_id'].values:
        print(f"Game {game_id} not found in existing fixtures, adding it dynamically")
        
        # Try to get fixture data from active endpoint
        active_endpoint = "https://api.opticodds.com/api/v3/fixtures/active?sport=basketball&league=nba&is_live=false&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
        try:
            response = requests.get(active_endpoint)
            response.raise_for_status()
            active_fixtures = response.json().get('data', [])
            
            # Find our specific fixture in the active fixtures
            fixture = None
            for f in active_fixtures:
                if f.get('id') == fixture_id:
                    fixture = f
                    break
                    
            if fixture:
                print(f"Found fixture {fixture_id} in active fixtures")
                start_date = fixture.get('start_date', datetime.now().isoformat())
                home_competitors = fixture.get('home_competitors', [])
                away_competitors = fixture.get('away_competitors', [])
                
                if not home_competitors or not away_competitors:
                    print(f"Missing competitor data for game {game_id}")
                    return 0
                
                # Create new fixture entry
                new_fixture = {
                    'game_id': game_id,
                    'start_date': pd.to_datetime(start_date),
                    'home_competitors': home_competitors,
                    'away_competitors': away_competitors,
                    'home_team_id': home_competitors[0]['id'],
                    'away_team_id': away_competitors[0]['id'],
                    'home_team_win_percentage_before': 0.5,  # Default value
                    'away_team_win_percentage_before': 0.5,  # Default value
                }
            else:
                print(f"Could not find fixture {fixture_id} in active fixtures, need manual team IDs")
                # Fall back to manual entry like in the original model
                if not args.dry_run:  # Only ask for input in interactive mode
                    try:
                        home_team = input("Enter home team ID (e.g., 8F17F23FB753): ")
                        away_team = input("Enter away team ID (e.g., 0054C2679F77): ")
                    except EOFError:
                        print("Running in non-interactive mode, using placeholder values")
                        home_team = "PLACEHOLDER_HOME"
                        away_team = "PLACEHOLDER_AWAY"
                else:
                    # For dry-run, use placeholder values
                    print("Dry run mode - using placeholder team IDs")
                    home_team = "PLACEHOLDER_HOME"
                    away_team = "PLACEHOLDER_AWAY"
                
                # Format team data like the fixtures table expects
                new_fixture = {
                    'game_id': game_id,
                    'start_date': pd.to_datetime(datetime.now().isoformat()),
                    'home_competitors': f'[{{"id":"{home_team}","name":"Unknown"}}]',
                    'away_competitors': f'[{{"id":"{away_team}","name":"Unknown"}}]',
                    'home_team_id': home_team,
                    'away_team_id': away_team,
                    'home_team_win_percentage_before': 0.5,
                    'away_team_win_percentage_before': 0.5
                }
            
            # Add to fixtures DataFrame
            fixtures = pd.concat([fixtures, pd.DataFrame([new_fixture])], ignore_index=True)
            print(f"Added fixture for {game_id} to the dataset")
            
        except Exception as e:
            print(f"Error fetching fixture data: {e}")
            return 0
    
    # Debug: Print unique player IDs in database
    db_player_ids = player_history['player_id'].unique()
    print(f"\nFound {len(db_player_ids)} unique player IDs in database")
    print(f"First 5 player IDs in database (sample): {db_player_ids[:5]}")
    
    # Debug: Check specific player IDs we're looking for
    print("\nChecking API player IDs against database:")
    for player_id in optic_lines.keys():
        player_name = player_names.get(player_id, "Unknown")
        if player_id in db_player_ids:
            print(f"✓ Player ID {player_id} ({player_name}) IS in database")
        else:
            # Try case-insensitive match
            player_id_lower = player_id.lower()
            db_matches = [pid for pid in db_player_ids if pid.lower() == player_id_lower]
            if db_matches:
                print(f"! Player ID {player_id} ({player_name}) matches {db_matches[0]} with different case")
            else:
                print(f"✗ Player ID {player_id} ({player_name}) NOT found in database")
    
    # Predict for all players with odds
    stats_to_predict = ['points', 'assists', 'total_rebounds']
    prediction_count = 0
    
    print(f"\nProcessing predictions for game {game_id} (Fixture ID: {fixture_id}):")
    
    # Generate a mapping for case-insensitive player IDs
    player_id_mapping = {}
    for db_player_id in player_history['player_id'].unique():
        player_id_mapping[db_player_id.upper()] = db_player_id
    
    for player_id, lines in optic_lines.items():
        player_name = player_names.get(player_id, f"Unknown Player ({player_id})")
        print(f"\nPlayer: {player_name} ({player_id})")
        
        # Case-insensitive check for player ID
        upper_player_id = player_id.upper()
        db_player_id = None
        
        # Direct match
        if player_id in player_history['player_id'].values:
            db_player_id = player_id
        # Case-insensitive match
        elif upper_player_id in player_id_mapping:
            db_player_id = player_id_mapping[upper_player_id]
        
        # Skip predictions if player has no history data
        if db_player_id is None:
            print(f"  No historical data found for {player_name}")
            continue
            
        print(f"  Found historical data with player ID: {db_player_id}")
        
        for stat in stats_to_predict:
            if stat in lines:
                # Use the correct case player ID from our database
                predicted_value = predict_player_stat(db_player_id, game_id, stat, all_params)
                optic_line = lines[stat]
                
                if isinstance(predicted_value, float):
                    prediction_count += 1
                    # Format to 2 decimal places to match original model
                    print(f"  {stat.capitalize()}: {predicted_value:.2f} (Optic Odds Line: {optic_line})")
                    
                    # For database saving, round to 1 decimal place
                    db_pred_value = round(predicted_value, 1)
                    
                    # Map stat to database naming
                    db_stat_type = stat
                    save_prediction_to_supabase(player_id, player_name, db_stat_type, optic_line, db_pred_value, 90, "OVER", predicted_value - optic_line)
                else:
                    print(f"  {stat.capitalize()}: {predicted_value} (Optic Odds Line: {optic_line})")
    
    return prediction_count

def get_upcoming_fixtures():
    # Fetch upcoming fixtures using the Optic API with the active endpoint
    url = "https://api.opticodds.com/api/v3/fixtures/active?sport=basketball&league=nba&is_live=false&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        fixtures_data = response.json()['data']
        
        # Process fixtures
        upcoming_fixtures = []
        for fixture in fixtures_data:
            fixture_id = fixture.get('id')
            if not fixture_id:
                continue
                
            # Extract home and away team information
            home_team_name = "Unknown"
            away_team_name = "Unknown"
            
            if 'home_competitors' in fixture and fixture['home_competitors']:
                home_team_name = fixture['home_competitors'][0].get('name', 'Unknown')
            
            if 'away_competitors' in fixture and fixture['away_competitors']:
                away_team_name = fixture['away_competitors'][0].get('name', 'Unknown')
                
            upcoming_fixtures.append({
                'id': fixture_id,
                'start_date': fixture.get('start_date'),
                'home_team': home_team_name,
                'away_team': away_team_name
            })
        
        return upcoming_fixtures
    except Exception as e:
        print(f"Error fetching upcoming fixtures: {e}")
        return []

def debug_player_data(player_id):
    """Print detailed information about a specific player in the database"""
    print(f"\n--- DEBUG INFO FOR PLAYER ID: {player_id} ---")
    
    # Check if player exists in player_history
    player_data = player_history[player_history['player_id'] == player_id]
    
    if len(player_data) == 0:
        print(f"No data found for player ID {player_id} in player_history table")
        
        # Check for case-insensitive matches
        player_id_lower = player_id.lower()
        player_ids = player_history['player_id'].unique()
        matches = [pid for pid in player_ids if pid.lower() == player_id_lower]
        
        if matches:
            print(f"Found potential case-sensitive matches: {matches}")
            player_data = player_history[player_history['player_id'] == matches[0]]
            print(f"Using match: {matches[0]}")
        else:
            print("No case-insensitive matches found either")
            return
    
    # Basic player info
    print(f"Player appears in {len(player_data)} games in player_history")
    
    if len(player_data) > 0:
        sample_game = player_data.iloc[0]
        print("\nSample record:")
        for col in sample_game.index:
            print(f"{col}: {sample_game[col]}")
        
        # Print available stats columns
        stat_columns = [col for col in player_data.columns if col not in ['player_id', 'game_id', 'start_date', 'team_id', 'is_home', 'opponent_win_percentage_before']]
        print(f"\nAvailable stat columns: {stat_columns}")
        
        # Print stats summary
        print("\nStats summary:")
        stats_summary = player_data[stat_columns].describe()
        for stat in stat_columns:
            if stat in stats_summary:
                mean = stats_summary[stat]['mean']
                max_val = stats_summary[stat]['max']
                min_val = stats_summary[stat]['min']
                print(f"{stat}: mean={mean:.2f}, min={min_val:.2f}, max={max_val:.2f}")
    
    print("--- END DEBUG INFO ---\n")

def main():
    # Handle debug player request first
    if args.debug_player:
        debug_player_data(args.debug_player)
        if not args.fixture_id:  # If only debugging, exit after showing debug info
            return
    
    total_predictions = 0
    
    if args.fixture_id:
        # Run for a specific fixture
        total_predictions = process_fixture(args.fixture_id)
    else:
        # Run for all upcoming fixtures
        upcoming_fixtures = get_upcoming_fixtures()
        print(f"Found {len(upcoming_fixtures)} upcoming fixtures")
        
        for fixture in upcoming_fixtures:
            fixture_id = fixture.get('id')
            home_team = fixture.get('home_team', 'Unknown')
            away_team = fixture.get('away_team', 'Unknown')
            print(f"\nProcessing {home_team} vs {away_team} (ID: {fixture_id})")
            
            predictions = process_fixture(fixture_id)
            total_predictions += predictions
    
    print(f"\nGenerated a total of {total_predictions} predictions")

if __name__ == "__main__":
    main() 