'use client'

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react'
import { PlayerData } from '@/app/types'

// Define the state shape
interface AppState {
  playerOdds: {
    data: PlayerData[]
    isLoading: boolean
    error: string | null
    pagination: {
      page: number
      pageSize: number
      total: number
      totalPages: number
    }
  }
  filters: {
    stat: string
    team: string
    fixture: string
  }
  fixtures: string[]
  teams: string[]
}

// Define action types
type AppAction =
  | { type: 'SET_PLAYER_ODDS'; payload: PlayerData[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PAGINATION'; payload: { page: number; pageSize: number; total: number; totalPages: number } }
  | { type: 'SET_FILTER'; payload: { key: 'stat' | 'team' | 'fixture'; value: string } }
  | { type: 'SET_FIXTURES'; payload: string[] }
  | { type: 'SET_TEAMS'; payload: string[] }
  | { type: 'SET_PAGE'; payload: number }

// Initial state
const initialState: AppState = {
  playerOdds: {
    data: [],
    isLoading: false,
    error: null,
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0
    }
  },
  filters: {
    stat: 'all',
    team: 'all',
    fixture: 'all'
  },
  fixtures: [],
  teams: []
}

// Create context
const AppStateContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
} | undefined>(undefined)

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PLAYER_ODDS':
      return {
        ...state,
        playerOdds: {
          ...state.playerOdds,
          data: action.payload
        }
      }
    case 'SET_LOADING':
      return {
        ...state,
        playerOdds: {
          ...state.playerOdds,
          isLoading: action.payload
        }
      }
    case 'SET_ERROR':
      return {
        ...state,
        playerOdds: {
          ...state.playerOdds,
          error: action.payload
        }
      }
    case 'SET_PAGINATION':
      return {
        ...state,
        playerOdds: {
          ...state.playerOdds,
          pagination: action.payload
        }
      }
    case 'SET_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.key]: action.payload.value
        }
      }
    case 'SET_FIXTURES':
      return {
        ...state,
        fixtures: action.payload
      }
    case 'SET_TEAMS':
      return {
        ...state,
        teams: action.payload
      }
    case 'SET_PAGE':
      return {
        ...state,
        playerOdds: {
          ...state.playerOdds,
          pagination: {
            ...state.playerOdds.pagination,
            page: action.payload
          }
        }
      }
    default:
      return state
  }
}

// Provider component
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  )
}

// Custom hook to use the app state
export function useAppState() {
  const context = useContext(AppStateContext)
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider')
  }
  return context
}

// Custom hook for player odds data
export function usePlayerOdds() {
  const { state, dispatch } = useAppState()
  
  return {
    playerOdds: state.playerOdds.data,
    isLoading: state.playerOdds.isLoading,
    error: state.playerOdds.error,
    pagination: state.playerOdds.pagination,
    setPlayerOdds: (data: PlayerData[]) => dispatch({ type: 'SET_PLAYER_ODDS', payload: data }),
    setLoading: (isLoading: boolean) => dispatch({ type: 'SET_LOADING', payload: isLoading }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    setPagination: (pagination: { page: number; pageSize: number; total: number; totalPages: number }) => 
      dispatch({ type: 'SET_PAGINATION', payload: pagination }),
    setPage: (page: number) => dispatch({ type: 'SET_PAGE', payload: page })
  }
}

// Custom hook for filters
export function useFilters() {
  const { state, dispatch } = useAppState()
  
  return {
    filters: state.filters,
    fixtures: state.fixtures,
    teams: state.teams,
    setFilter: (key: 'stat' | 'team' | 'fixture', value: string) => 
      dispatch({ type: 'SET_FILTER', payload: { key, value } }),
    setFixtures: (fixtures: string[]) => dispatch({ type: 'SET_FIXTURES', payload: fixtures }),
    setTeams: (teams: string[]) => dispatch({ type: 'SET_TEAMS', payload: teams })
  }
} 