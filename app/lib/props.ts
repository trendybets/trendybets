export interface Sportsbook {
  name: string
  logo: string
}

export interface PlayerProp {
  id: string
  player_id: string
  points: number
  market_id: string
  selection_line: string
  name?: string
  sportsbook: {
    name: string
    logo: string
  }
} 