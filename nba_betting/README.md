# NBA Prop Prediction System

This folder contains a Python-based system for predicting NBA player prop bets using historical data and machine learning techniques.

## Overview

The system uses weighted historical player performance data, along with factors like home/away advantage and opponent strength, to predict player performance for upcoming games. It then compares these predictions against current betting lines to identify potentially advantageous bets.

## Key Files

- `nba_prop_predictor_with_optic.py`: The main prediction script that uses trained parameters to generate predictions for upcoming games
- `nba_prop_trainer.py`: Trainer script used to find optimal parameters for the prediction model
- `run_predictions.py`: Script that interfaces with the application, generating predictions and saving them to the database
- `update_paths.py`: Utility script to update hardcoded file paths
- `best_params.json`: Saved optimal parameters for points, assists, and rebounds predictions
- `player_history.csv`: Historical player performance data
- `fixtures.csv`: NBA game fixture data
- `player_teams.csv`: Mapping between players and teams for each game

## Data Sources

The system uses data from the following sources:
- Historical player performance data (stored in CSV files)
- Optic Odds API for current betting lines
- NBA API for upcoming game information

## How It Works

1. **Data Processing**:
   - Load historical player performance data
   - Calculate team win percentages and other features
   - Enrich player history with contextual information

2. **Prediction**:
   - Use weighted recent game performance
   - Apply home/away advantage factors
   - Consider opponent strength
   - Generate final predictions for points, rebounds, and assists

3. **Integration**:
   - Fetch current betting lines from Optic Odds API
   - Compare predictions to betting lines
   - Calculate edge and confidence scores
   - Save predictions to the database

## Running Predictions

The system is integrated with the application through:

1. **Web Interface**: Use the "Run Predictions" page in the application
2. **API Endpoint**: `/api/run-predictions` can be called programmatically
3. **Direct Script**: Run `python run_predictions.py` with optional parameters:
   - `--fixture_id`: Run for a specific game
   - `--dry_run`: Preview predictions without saving
   - `--refresh_data`: Force data refresh

## Setup

Before running for the first time, you should run the update paths script to ensure all file paths are correct:

```
python update_paths.py
```

## Requirements

- pandas
- numpy
- requests
- supabase

## Maintainer

Clay Tucker 