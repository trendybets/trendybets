#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timezone
import time
import sys
from supabase import create_client
import pandas as pd

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

def fetch_fixtures_from_supabase():
    """Fetch upcoming fixtures from Supabase database"""
    print("Fetching upcoming fixtures from Supabase 'fixtures' table...")
    
    try:
        # Query fixtures table for upcoming fixtures
        response = supabase.table("fixtures").select("*").execute()
        
        if not hasattr(response, 'data') or len(response.data) == 0:
            print("No fixtures found in the database!")
            return []
        
        fixtures = response.data
        print(f"Found {len(fixtures)} upcoming fixtures in the database")
        
        # Process fixtures to get the required information
        processed_fixtures = []
        for fixture in fixtures:
            # Get the ID directly - this is what we'll use for the Optic API
            fixture_id = fixture.get('id')
            if not fixture_id:
                continue
                
            processed_fixture = {
                'id': fixture_id,
                'start_date': fixture.get('start_date', ''),
                'status': 'upcoming',  # These are upcoming fixtures
                'home_team': fixture.get('home_team_name', 'Unknown'),
                'away_team': fixture.get('away_team_name', 'Unknown')
            }
            
            processed_fixtures.append(processed_fixture)
        
        return processed_fixtures
        
    except Exception as e:
        print(f"Error fetching fixtures from Supabase: {e}")
        return []

def check_player_props(fixture_id):
    """Check if player props are available for a specific fixture"""
    # Use the exact endpoint format provided by the user
    endpoint = f"https://api.opticodds.com/api/v3/fixtures/odds?sportsbook=draftkings&fixture_id={fixture_id}&market=player%20points&market=player%20assists&market=player%20rebounds&is_main=true&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
    
    try:
        response = requests.get(endpoint)
        if response.status_code != 200:
            return False
            
        data = response.json()
        
        # Check if data is not empty and contains player props
        if 'data' in data and data['data']:
            for item in data['data']:
                if 'odds' in item and item['odds']:
                    return True
        
        return False
    except Exception as e:
        print(f"Error checking player props: {e}")
        return False

def get_market_lines(fixture_id):
    """Fetch betting lines for a specific fixture"""
    print(f"\nFetching betting lines for fixture: {fixture_id}")
    
    # Use the exact endpoint format provided by the user
    player_props_endpoint = f"https://api.opticodds.com/api/v3/fixtures/odds?sportsbook=draftkings&fixture_id={fixture_id}&market=player%20points&market=player%20assists&market=player%20rebounds&is_main=true&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
    
    try:
        response = requests.get(player_props_endpoint)
        response.raise_for_status()
        
        player_props_data = response.json()
        
        # Save raw response for debugging
        with open('player_props_response.json', 'w') as f:
            json.dump(player_props_data, f, indent=2)
            print("Player props response saved to player_props_response.json")
        
        props_found = False
        if 'data' in player_props_data and player_props_data['data']:
            for item in player_props_data['data']:
                if 'odds' in item and item['odds']:
                    props_found = True
                    print("\nPlayer props available:")
                    for odd in item.get('odds', []):
                        player_name = odd.get('selection', 'Unknown')
                        market = odd.get('market', 'Unknown')
                        points = odd.get('points', 'N/A')
                        print(f"- {player_name}: {market} = {points}")
        
        if not props_found:
            print("\nNo player props available with the specified endpoint.")
            
            # Try to get players for this fixture
            players_endpoint = f"https://api.opticodds.com/api/v3/fixtures/players?fixture_id={fixture_id}&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
            players_response = requests.get(players_endpoint)
            
            if players_response.status_code == 200:
                players_data = players_response.json()
                with open('players_response.json', 'w') as f:
                    json.dump(players_data, f, indent=2)
                    print("Players response saved to players_response.json")
                
                if 'data' in players_data and players_data['data']:
                    print(f"Found {len(players_data['data'])} players for this fixture")
                    for player in players_data['data'][:5]:  # Check first 5 players
                        player_id = player.get('id')
                        player_name = player.get('name', 'Unknown')
                        
                        if player_id:
                            print(f"\nChecking props for player: {player_name} ({player_id})")
                            player_endpoint = f"https://api.opticodds.com/api/v3/fixtures/odds?sportsbook=draftkings&fixture_id={fixture_id}&player_id={player_id}&market=player%20points&market=player%20assists&market=player%20rebounds&is_main=true&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
                            player_response = requests.get(player_endpoint)
                            
                            if player_response.status_code == 200:
                                player_data = player_response.json()
                                
                                # Save player-specific response
                                with open(f'player_{player_id}_props.json', 'w') as f:
                                    json.dump(player_data, f, indent=2)
                                
                                if 'data' in player_data and player_data['data']:
                                    for item in player_data['data']:
                                        if 'odds' in item and item['odds']:
                                            props_found = True
                                            print(f"Props found for {player_name}:")
                                            for odd in item.get('odds', []):
                                                if 'market' in odd:
                                                    print(f"- {odd.get('market')}: {odd.get('points', 'N/A')}")
                else:
                    print("No players found for this fixture")
            else:
                print("Failed to get players for this fixture")
                
        if not props_found:
            print("\nNo player props available for this fixture with any method")
    
    except Exception as e:
        print(f"Error fetching player props: {e}")
    
    # Then check all markets
    all_markets_endpoint = f"https://api.opticodds.com/api/v3/fixtures/odds?fixture_id={fixture_id}&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
    
    try:
        print("\nFetching all available markets...")
        response = requests.get(all_markets_endpoint)
        response.raise_for_status()
        
        data = response.json()
        
        # Save raw response for debugging
        with open('all_markets_response.json', 'w') as f:
            json.dump(data, f, indent=2)
            print("Full API response saved to all_markets_response.json")
        
        if 'data' in data and data['data']:
            markets = {}
            
            # Count available markets
            for item in data['data']:
                for odd in item.get('odds', []):
                    market_type = odd.get('market', 'unknown')
                    if market_type not in markets:
                        markets[market_type] = 0
                    markets[market_type] += 1
            
            # Print available markets
            if markets:
                print("\nAvailable betting markets:")
                for market, count in sorted(markets.items()):
                    print(f"- {market}: {count} lines")
            else:
                print("No betting markets found")
        else:
            print("No data returned from API")
    
    except Exception as e:
        print(f"Error fetching market lines: {e}")

def fetch_fixtures_from_optic_api():
    """Fetch active fixtures directly from the Optic Odds API"""
    print("Fetching active fixtures directly from Optic Odds API...")
    
    # Using the active fixtures endpoint provided by the user
    url = "https://api.opticodds.com/api/v3/fixtures/active?sport=basketball&league=nba&is_live=false&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        if 'data' not in data or not data['data']:
            print("No active fixtures found in the API!")
            return []
        
        fixtures = data['data']
        print(f"Found {len(fixtures)} active fixtures in the API")
        
        # Process fixtures to get the required information
        processed_fixtures = []
        for fixture in fixtures:
            fixture_id = fixture.get('id')
            if not fixture_id:
                continue
            
            # Extract home and away team names
            home_team = "Unknown"
            away_team = "Unknown"
            
            if 'home_competitors' in fixture and fixture['home_competitors']:
                home_team = fixture['home_competitors'][0].get('name', 'Unknown')
            
            if 'away_competitors' in fixture and fixture['away_competitors']:
                away_team = fixture['away_competitors'][0].get('name', 'Unknown')
            
            processed_fixture = {
                'id': fixture_id,
                'start_date': fixture.get('start_date', ''),
                'status': fixture.get('status', 'unknown'),
                'home_team': home_team,
                'away_team': away_team
            }
            
            processed_fixtures.append(processed_fixture)
        
        return processed_fixtures
    
    except Exception as e:
        print(f"Error fetching fixtures from Optic API: {e}")
        return []

def find_fixtures_with_props(use_api=False):
    """Find fixtures with player props"""
    print("Searching for fixtures with player props...")
    
    # Get fixtures from database or API
    if use_api:
        fixtures = fetch_fixtures_from_optic_api()
    else:
        fixtures = fetch_fixtures_from_supabase()
    
    if not fixtures:
        print("No fixtures found!")
        return
    
    # Check for player props availability
    available_fixtures = []
    total = len(fixtures)
    
    print(f"Checking {total} fixtures for player props...")
    for i, fixture in enumerate(fixtures):
        fixture_id = fixture.get('id')
        home_team = fixture.get('home_team', 'Unknown')
        away_team = fixture.get('away_team', 'Unknown')
        
        print(f"Checking fixture {i+1}/{total}: {home_team} vs {away_team} ({fixture_id})...", end="\r")
        
        if check_player_props(fixture_id):
            available_fixtures.append(fixture)
            print(f"Found props for: {home_team} vs {away_team} ({fixture_id})          ")
        
        # Add a small delay to avoid API rate limits
        time.sleep(0.2)
    
    print("\n" + "=" * 80)
    if available_fixtures:
        print(f"Found {len(available_fixtures)} fixtures with player props:")
        print("-" * 80)
        print(f"{'STATUS':<15}{'ID':<25}{'HOME TEAM':<25}{'AWAY TEAM':<25}{'DATE'}")
        print("-" * 80)
        
        for fixture in available_fixtures:
            status = fixture.get('status', 'unknown')
            fixture_id = fixture.get('id', 'N/A')
            home_team = fixture.get('home_team', 'Unknown')
            away_team = fixture.get('away_team', 'Unknown')
            date_str = fixture.get('start_date', '')
            
            # Format date
            try:
                if date_str:
                    dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    date_str = dt.strftime('%Y-%m-%d %H:%M')
            except:
                pass
                
            print(f"{status:<15}{fixture_id:<25}{home_team:<25}{away_team:<25}{date_str}")
        
        print("\nFor immediate predictions, run:")
        print(f"python nba_betting/run_predictions.py --fixture_id {available_fixtures[0]['id']} --dry_run")
    else:
        print("No fixtures with player props found")
        print("This could be because:")
        print("1. There are no games with player props currently available")
        print("2. The API doesn't have player props data yet")
        print("3. There might be an issue with the API key or endpoints")

def test_optic_api():
    """Test the Optic Odds API with some fixtures"""
    print("Testing Optic Odds API with sample queries...")
    
    # Test the fixtures endpoint
    print("\nTesting fixtures endpoint...")
    url = "https://api.opticodds.com/api/v3/fixtures?sport=basketball&league=nba&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        # Save sample response
        with open('optic_fixtures_response.json', 'w') as f:
            json.dump(data, f, indent=2)
            print("Fixtures response saved to optic_fixtures_response.json")
        
        if 'data' in data and data['data']:
            print(f"Success! Found {len(data['data'])} fixtures")
            # Try the specific fixture ID from the user's example
            sample_id = "nba:24AFD1BAE0DC"
            print(f"Using fixture ID from example: {sample_id}")
            
            # Try player props with the exact endpoint format
            print("\nTrying player props with the exact endpoint format")
            props_url = f"https://api.opticodds.com/api/v3/fixtures/odds?sportsbook=draftkings&fixture_id={sample_id}&market=player%20points&market=player%20assists&market=player%20rebounds&is_main=true&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
            
            props_response = requests.get(props_url)
            if props_response.status_code == 200:
                props_data = props_response.json()
                with open('player_props.json', 'w') as f:
                    json.dump(props_data, f, indent=2)
                
                if 'data' in props_data and props_data['data'] and any(item.get('odds') for item in props_data['data']):
                    print("Success! Found player props")
                    # Count the player props
                    player_count = set()
                    prop_count = 0
                    for item in props_data['data']:
                        for odd in item.get('odds', []):
                            if 'selection' in odd:
                                player_count.add(odd['selection'])
                                prop_count += 1
                    print(f"Found {prop_count} props for {len(player_count)} different players")
                else:
                    print("No player props found in the response")
            
            # First try to get players for this fixture
            print("\nTrying to get players for this fixture...")
            players_url = f"https://api.opticodds.com/api/v3/fixtures/players?fixture_id={sample_id}&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
            
            players_response = requests.get(players_url)
            if players_response.status_code == 200:
                players_data = players_response.json()
                with open('sample_players.json', 'w') as f:
                    json.dump(players_data, f, indent=2)
                
                if 'data' in players_data and players_data['data']:
                    print(f"Found {len(players_data['data'])} players")
                    
                    # Try player props with the specific player ID from the user's example
                    specific_player_id = "A516E172A7D9"
                    print(f"\nTrying player props with specific player ID: {specific_player_id}")
                    props_url = f"https://api.opticodds.com/api/v3/fixtures/odds?sportsbook=draftkings&fixture_id={sample_id}&player_id={specific_player_id}&market=player%20points&market=player%20assists&market=player%20rebounds&is_main=true&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
                    
                    props_response = requests.get(props_url)
                    if props_response.status_code == 200:
                        props_data = props_response.json()
                        with open('specific_player_props.json', 'w') as f:
                            json.dump(props_data, f, indent=2)
                        
                        if 'data' in props_data and props_data['data'] and any(item.get('odds') for item in props_data['data']):
                            print("Success! Found props for the specific player")
                        else:
                            print("No props found for the specific player")
                    
                    # Try with some other players from the list
                    print("\nTrying with other players from the fixture...")
                    props_found = False
                    for player in players_data['data'][:5]:  # Check first 5 players
                        player_id = player.get('id')
                        player_name = player.get('name', 'Unknown')
                        
                        if player_id:
                            print(f"Checking player: {player_name} ({player_id})")
                            player_props_url = f"https://api.opticodds.com/api/v3/fixtures/odds?sportsbook=draftkings&fixture_id={sample_id}&player_id={player_id}&market=player%20points&market=player%20assists&market=player%20rebounds&is_main=true&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
                            
                            player_props_response = requests.get(player_props_url)
                            if player_props_response.status_code == 200:
                                player_props_data = player_props_response.json()
                                
                                if 'data' in player_props_data and player_props_data['data']:
                                    for item in player_props_data['data']:
                                        if 'odds' in item and item['odds']:
                                            props_found = True
                                            print(f"Props found for {player_name}")
                                            break
                    
                    if not props_found:
                        print("No props found for any player in this fixture")
                else:
                    print("No players found for this fixture")
            else:
                print(f"Failed to get players: {players_response.status_code}")
            
            # Also test the regular odds endpoint
            print("\nTesting odds endpoint with sample fixture...")
            odds_url = f"https://api.opticodds.com/api/v3/fixtures/odds?fixture_id={sample_id}&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
            
            odds_response = requests.get(odds_url)
            if odds_response.status_code == 200:
                odds_data = odds_response.json()
                
                # Save sample response
                with open('optic_odds_response.json', 'w') as f:
                    json.dump(odds_data, f, indent=2)
                
                if 'data' in odds_data and odds_data['data']:
                    print(f"Success! Found odds data for fixture {sample_id}")
                    
                    # Check what markets are available
                    markets = set()
                    for item in odds_data['data']:
                        for odd in item.get('odds', []):
                            market = odd.get('market')
                            if market:
                                markets.add(market)
                    
                    if markets:
                        print(f"Available markets: {', '.join(markets)}")
                    else:
                        print("No markets found in the response")
                else:
                    print(f"No odds data available for fixture {sample_id}")
            else:
                print(f"Failed to get odds: {odds_response.status_code}")
        else:
            print("No fixtures found in API response")
    
    except Exception as e:
        print(f"API test failed: {e}")

if __name__ == "__main__":
    print("NBA Betting - Fixture Finder")
    print("=" * 50)
    print("1. Find fixtures with player props (from Supabase database)")
    print("2. Find fixtures with player props (from Optic API)")
    print("3. Check specific fixture")
    print("4. Test Optic Odds API")
    print("=" * 50)
    
    choice = input("Enter your choice (1-4): ")
    
    if choice == '1':
        find_fixtures_with_props(use_api=False)
    
    elif choice == '2':
        find_fixtures_with_props(use_api=True)
    
    elif choice == '3':
        fixture_id = input("Enter fixture ID: ")
        get_market_lines(fixture_id)
    
    elif choice == '4':
        test_optic_api()
    
    else:
        print("Invalid choice") 