import { supabase } from './database'

export async function syncTeams() {
  const response = await fetch('/api/sync/teams', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error('Failed to sync teams')
  }

  return response.json()
}

export async function syncPlayerOdds() {
  try {
    const response = await fetch('/api/sync-player-odds', {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`Failed to sync player odds: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Player odds sync result:', data)
    return data
  } catch (error) {
    console.error('Error syncing player odds:', error)
    throw error
  }
}

export async function syncFixturesCompleted() {
  const response = await fetch('/api/sync-fixtures-completed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error('Failed to sync completed fixtures')
  }

  return response.json()
}

export async function syncFixtureResults() {
  const response = await fetch('/api/sync-fixture-results', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error('Failed to sync fixture results')
  }

  return response.json()
}

export async function syncAll() {
  await Promise.all([
    syncTeams(),
    syncPlayerOdds(),
    syncFixturesCompleted()
    // ... other sync functions
  ])
} 