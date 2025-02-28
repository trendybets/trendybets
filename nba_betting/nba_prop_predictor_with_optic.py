import pandas as pd
import numpy as np
import json
import requests

# Load historical data
player_history = pd.read_csv('/Users/claytucker/trendybets/nba_betting/player_history.csv', parse_dates=['start_date'])
fixtures = pd.read_csv('/Users/claytucker/trendybets/nba_betting/fixtures.csv', parse_dates=['start_date'])
player_teams = pd.read_csv('/Users/claytucker/trendybets/nba_betting/player_teams.csv')
player_history = player_history.merge(player_teams[['player_id', 'game_id', 'team_id']], on=['player_id', 'game_id'])

# Load best parameters
with open('/Users/claytucker/trendybets/nba_betting/best_params.json', 'r') as f:
    all_params = json.load(f)

# Prepare team win percentages
team_game = []
for _, row in fixtures.iterrows():
    home_team = eval(row['home_competitors'])[0]['id']
    away_team = eval(row['away_competitors'])[0]['id']
    if pd.notna(row.get('home_score_total')) and pd.notna(row.get('away_score_total')):
        won = row['home_score_total'] > row['away_score_total']
        team_game.extend([
            {'team_id': home_team, 'game_id': row['game_id'], 'start_date': row['start_date'], 'is_home': True, 'won': won},
            {'team_id': away_team, 'game_id': row['game_id'], 'start_date': row['start_date'], 'is_home': False, 'won': not won}
        ])
team_game = pd.DataFrame(team_game)
team_game = team_game.sort_values(['team_id', 'start_date'])
team_game['cum_games_before'] = team_game.groupby('team_id').cumcount()
team_game['cum_wins_before'] = team_game.groupby('team_id')['won'].cumsum().shift(1, fill_value=0)
team_game['win_percentage_before'] = team_game['cum_wins_before'] / team_game['cum_games_before'].replace(0, 1)
team_game['win_percentage_before'] = team_game['win_percentage_before'].fillna(0.5)

# Merge to fixtures
fixtures['home_team_id'] = fixtures['home_competitors'].apply(lambda x: eval(x)[0]['id'])
fixtures['away_team_id'] = fixtures['away_competitors'].apply(lambda x: eval(x)[0]['id'])
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
    endpoint = f"https://api.opticodds.com/api/v3/fixtures/odds?sportsbook=draftkings&fixture_id={fixture_id}&market=player%20points&market=player%20assists&market=player%20rebounds&is_main=true&key=ffb64ea8-84cd-4c78-af51-1468ae7111d3"
    try:
        response = requests.get(endpoint)
        response.raise_for_status()
        data = response.json()['data'][0]
        game_id = data['game_id']
        odds = data['odds']
        
        player_lines = {}
        for odd in odds:
            player_id = odd['player_id']
            stat = odd['market'].replace('Player ', '').lower().replace('rebounds', 'total_rebounds')
            points = odd['points']
            if player_id not in player_lines:
                player_lines[player_id] = {}
            player_lines[player_id][stat] = points
        
        return game_id, player_lines
    except Exception as e:
        print(f"Error fetching Optic Odds: {e}")
        return None, {}

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
    
    is_home = player_history[player_history['player_id'] == player_id]['team_id'].iloc[0] == target_game['home_team_id']
    opponent_win_pct = target_game['away_team_win_percentage_before'] if is_home else target_game['home_team_win_percentage_before']
    home_adjust = 1 + home_advantage if is_home else 1 - home_advantage
    if pd.isna(pred) or pd.isna(opponent_win_pct):
        return f"NaN in final prediction for {player_id}"
    final_pred = pred * home_adjust  # Removed / 0.5
    
    return final_pred

# Terminal input
fixture_id = input("Enter fixture ID (e.g., nba:24AFD1BAE0DC): ")

# Fetch Optic Odds data
game_id, optic_lines = fetch_optic_odds(fixture_id)

if game_id and optic_lines:
    if game_id not in fixtures['game_id'].values:
        home_team = input("Enter home team ID (e.g., 8F17F23FB753): ")
        away_team = input("Enter away team ID (e.g., 0054C2679F77): ")
        tonight_game = {
            'game_id': game_id,
            'start_date': '2025-02-26 23:00:00+00',
            'home_competitors': f'[{{"id":"{home_team}","name":"Unknown"}}]',
            'away_competitors': f'[{{"id":"{away_team}","name":"Unknown"}}]'
        }
        fixtures = pd.concat([fixtures, pd.DataFrame([tonight_game])], ignore_index=True)
        fixtures.loc[fixtures['game_id'] == game_id, 'home_team_win_percentage_before'] = latest_wins.get(home_team, 0.5)
        fixtures.loc[fixtures['game_id'] == game_id, 'away_team_win_percentage_before'] = latest_wins.get(away_team, 0.5)

    # Predict for all players with odds
    stats_to_predict = ['points', 'assists', 'total_rebounds']
    print(f"\nPredictions for game {game_id} (Fixture ID: {fixture_id}):")
    for player_id, lines in optic_lines.items():
        print(f"\nPlayer: {player_id}")
        for stat in stats_to_predict:
            if stat in lines:
                predicted_value = predict_player_stat(player_id, game_id, stat, all_params)
                optic_line = lines[stat]
                if isinstance(predicted_value, float):
                    print(f"{stat.capitalize()}: {predicted_value:.2f} (Optic Odds Line: {optic_line})")
                else:
                    print(f"{stat.capitalize()}: {predicted_value} (Optic Odds Line: {optic_line})")
else:
    print("Failed to fetch data from Optic Odds.")