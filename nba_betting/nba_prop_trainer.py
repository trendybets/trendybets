import pandas as pd
from sklearn.metrics import mean_absolute_error
import itertools
import numpy as np
import json

# Load data with date parsing
player_history = pd.read_csv('/Users/claytucker/trendybets/nba_betting/player_history.csv', parse_dates=['start_date'])
fixtures = pd.read_csv('/Users/claytucker/trendybets/nba_betting/fixtures.csv', parse_dates=['start_date'])
player_teams = pd.read_csv('/Users/claytucker/trendybets/nba_betting/player_teams.csv')
player_history = player_history.merge(player_teams[['player_id', 'game_id', 'team_id']], on=['player_id', 'game_id'])

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
    lambda row: row['away_team_win_percentage_before'] if row['is_home'] else row['home_team_win_percentage_before'], axis=1
)

# Prediction function with NaN handling and opponent_weight
def predict_stat(df, stat, N, decay_factor, home_advantage, opponent_weight):
    predictions = []
    for player_id in df['player_id'].unique():
        player_games = df[df['player_id'] == player_id].sort_values('start_date')
        for k in range(1, len(player_games)):
            past_games = player_games.iloc[max(0, k-N):k]
            if len(past_games) == 0:
                continue
            positions = range(len(past_games))
            recency_weights = [decay_factor ** i for i in reversed(positions)]
            weights = (
                pd.Series(recency_weights) *
                past_games['opponent_win_percentage_before'].fillna(0.5) * opponent_weight *
                past_games['is_home'].apply(lambda x: 1 + home_advantage if x else 1 - home_advantage)
            )
            if weights.sum() == 0 or np.isnan(weights.sum()):
                pred = np.nan
            else:
                pred = (past_games[stat] * weights).sum() / weights.sum()
            curr_game = player_games.iloc[k]
            home_adjust = 1 + home_advantage if curr_game['is_home'] else 1 - home_advantage
            opponent_win_pct = curr_game['opponent_win_percentage_before']
            if pd.isna(pred) or pd.isna(opponent_win_pct):
                final_pred = np.nan
            else:
                final_pred = pred * home_adjust * opponent_win_pct / 0.5
            predictions.append({
                'player_id': player_id,
                'game_id': curr_game['game_id'],
                'predicted_stat': final_pred,
                'actual_stat': curr_game[stat]
            })
    preds_df = pd.DataFrame(predictions)
    if preds_df.empty:
        print(f"Warning: No predictions generated for {stat}.")
    return preds_df

# Train and test for multiple stats
def train_model(stats):
    param_grid = {
        'N': [3, 5, 10, 15, 20],  # Expanded range
        'decay_factor': [0.7, 0.8, 0.85, 0.9, 0.95],  # Finer steps
        'home_advantage': [0.0, 0.05, 0.1, 0.15, 0.2],  # Wider range
        'opponent_weight': [0.5, 1.0, 1.5]  # New parameter
    }
    all_params = {}
    split_date = player_history['start_date'].quantile(0.8)
    train_data = player_history[player_history['start_date'] <= split_date]
    test_data = player_history[player_history['start_date'] > split_date]
    
    for stat in stats:
        best_mae = float('inf')
        best_params = None
        print(f"\nTraining for {stat}:")
        for N, decay, ha, ow in itertools.product(param_grid['N'], param_grid['decay_factor'], param_grid['home_advantage'], param_grid['opponent_weight']):
            preds = predict_stat(test_data, stat, N, decay, ha, ow)
            if preds.empty:
                continue
            valid_preds = preds.dropna(subset=['predicted_stat', 'actual_stat'])
            if valid_preds.empty:
                continue
            mae = mean_absolute_error(valid_preds['actual_stat'], valid_preds['predicted_stat'])
            print(f"Params: N={N}, decay={decay}, home_advantage={ha}, opponent_weight={ow}, MAE={mae:.2f}, Valid Predictions={len(valid_preds)}")
            if mae < best_mae:
                best_mae = mae
                best_params = {'N': N, 'decay_factor': decay, 'home_advantage': ha, 'opponent_weight': ow}
        
        if best_params is None:
            print(f"No valid parameters found for {stat}.")
        else:
            print(f"Best Params for {stat}: {best_params}, Best MAE: {best_mae:.2f}")
            all_params[stat] = best_params
    
    return all_params

# Train for points, assists, total_rebounds
stats_to_train = ['points', 'assists', 'total_rebounds']
all_params = train_model(stats_to_train)
if all_params:
    with open('/Users/claytucker/trendybets/nba_betting/best_params.json', 'w') as f:
        json.dump(all_params, f)