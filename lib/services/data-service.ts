'use client'

import { fetchPlayerOdds, fetchActiveFixtures, fetchTeams } from '@/app/lib/api'
import { PlayerData } from '@/app/types'

/**
 * Fetches player odds data with pagination
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 * @param fixtureLimit Limit the number of fixtures to process (0 for all)
 * @returns Player odds data and pagination metadata
 */
export async function fetchPlayerOddsData(
  page = 1,
  pageSize = 20,
  fixtureLimit = 0
): Promise<{
  data: PlayerData[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  fixtures: string[]
  teams: string[]
}> {
  try {
    // Fetch player odds data
    const response = await fetchPlayerOdds(fixtureLimit, page, pageSize)
    
    // Extract unique fixtures
    const fixtureSet = new Set<string>()
    const teamSet = new Set<string>()
    
    response.data.forEach(player => {
      // Add team to teams set
      if (player.player?.team) {
        teamSet.add(player.player.team)
      }
      
      // Add fixture to fixtures set
      if (player.next_game && player.next_game.home_team && player.next_game.away_team) {
        const fixtureString = `${player.next_game.home_team} vs ${player.next_game.away_team}`
        fixtureSet.add(fixtureString)
      }
    })
    
    return {
      data: response.data,
      pagination: response.pagination,
      fixtures: Array.from(fixtureSet),
      teams: Array.from(teamSet).sort()
    }
  } catch (error) {
    console.error('Error fetching player odds data:', error)
    throw error
  }
}

/**
 * Fetches active fixtures with pagination
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 * @returns Active fixtures data and pagination metadata
 */
export async function fetchActiveFixturesData(page = 1, pageSize = 20) {
  try {
    return await fetchActiveFixtures(page, pageSize)
  } catch (error) {
    console.error('Error fetching active fixtures data:', error)
    throw error
  }
}

/**
 * Fetches team data
 * @returns Team data
 */
export async function fetchTeamsData() {
  try {
    return await fetchTeams()
  } catch (error) {
    console.error('Error fetching teams data:', error)
    throw error
  }
} 