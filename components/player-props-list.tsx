import type { Database } from "@/types/supabase"
import { PlayerPropCard } from "@/components/player-prop-card"

type PlayerProp = Database['public']['Tables']['player_odds']['Row']
type Player = Database['public']['Tables']['players']['Row']

interface PlayerPropsListProps {
  playerProps: PlayerProp[]
  homeTeam: string
  awayTeam: string
  isVisible: boolean
  players: Player[]
  homeTeamDisplay?: string
  awayTeamDisplay?: string
}

export function PlayerPropsList({ 
  playerProps, 
  homeTeam,
  awayTeam,
  isVisible,
  players,
  homeTeamDisplay = 'Home Team',
  awayTeamDisplay = 'Away Team'
}: PlayerPropsListProps) {
  console.log('PlayerPropsList received:', { 
    playerPropsCount: playerProps.length,
    homeTeam,
    awayTeam,
    isVisible,
    sampleProp: playerProps[0]
  });

  if (!isVisible) {
    console.log('PlayerPropsList hidden because isVisible is false');
    return null;
  }

  // Create a map of team IDs to team names
  const teamNames = {
    [homeTeam]: homeTeamDisplay,
    [awayTeam]: awayTeamDisplay
  }

  // Group props by market and team
  const pointsProps = playerProps.filter(prop => prop.market_id === 'player_points')
  console.log('Points props:', pointsProps.length);

  // Create a map of player_id to team_id
  const playerTeamMap = new Map(
    players.map(player => [player.id, player.team_id])
  )

  // Group by team using player's team_id
  const homeTeamProps = pointsProps.filter(prop => {
    const playerTeamId = prop.player_id ? playerTeamMap.get(prop.player_id) : null
    return playerTeamId === homeTeam
  })

  const awayTeamProps = pointsProps.filter(prop => {
    const playerTeamId = prop.player_id ? playerTeamMap.get(prop.player_id) : null
    return playerTeamId === awayTeam
  })

  // Add more detailed logging
  console.log('Sample prop name processing:', {
    original: pointsProps[0]?.name,
    cleaned: pointsProps[0]?.name.split(' ').slice(0, -2).join(' '),
    homeTeam,
    awayTeam
  });

  console.log('Team grouping debug:', {
    totalProps: pointsProps.length,
    playerMapSize: playerTeamMap.size,
    sampleProp: pointsProps[0],
    samplePlayer: players[0],
    homeTeamProps: homeTeamProps.length,
    awayTeamProps: awayTeamProps.length
  })

  // Group props by player
  const groupPropsByPlayer = (props: PlayerProp[]) => {
    const grouped = new Map<string, { 
      over: PlayerProp | null; 
      under: PlayerProp | null;
      player?: Player  // Add player data
    }>()
    
    props.forEach(prop => {
      const playerName = prop.selection
      const existing = grouped.get(playerName) || { 
        over: null, 
        under: null,
        player: players.find(p => p.id === prop.player_id)  // Find matching player
      }
      
      if (prop.selection_line === 'over') {
        existing.over = prop
      } else {
        existing.under = prop
      }
      
      grouped.set(playerName, existing)
    })
    
    return Array.from(grouped.values())
  }

  // Temporary dummy game history data
  const dummyGameHistory = [
    { value: 22, opponent: "GSW" },
    { value: 18, opponent: "LAC" },
    { value: 25, opponent: "PHX" },
    { value: 30, opponent: "DEN" },
    { value: 15, opponent: "MEM" }
  ]

  return (
    <div className="mt-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Away Team Props (Left Side) */}
        <div>
          <h3 className="text-xl font-semibold mb-4 text-white">{teamNames[awayTeam]} Players</h3>
          <div className="space-y-4">
            {groupPropsByPlayer(awayTeamProps).map(({ over, under, player }, index) => (
              <PlayerPropCard
                key={index}
                playerName={over?.selection || ''}
                playerId={over?.player_id || ''}
                propType="Points"
                line={over?.points || 0}
                price={over?.price || 0}
                playerLogo={player?.logo}
                timeframe="10"
              />
            ))}
          </div>
        </div>

        {/* Home Team Props (Right Side) */}
        <div>
          <h3 className="text-xl font-semibold mb-4 text-white">{teamNames[homeTeam]} Players</h3>
          <div className="space-y-4">
            {groupPropsByPlayer(homeTeamProps).map(({ over, under, player }, index) => (
              <PlayerPropCard
                key={index}
                playerName={over?.selection || ''}
                playerId={over?.player_id || ''}
                propType="Points"
                line={over?.points || 0}
                price={over?.price || 0}
                playerLogo={player?.logo}
                timeframe="10"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 