'use client'

import { teamColors } from '@/lib/team-colors'

interface PlayerTeamDisplayProps {
  team: string
  className?: string
}

export function PlayerTeamDisplay({ team, className = '' }: PlayerTeamDisplayProps) {
  // Get team colors for visual accents
  const teamColor = teamColors[team] || { primary: "#0072ff", secondary: "#f2f2f2" }
  
  return (
    <div className={`flex items-center ${className}`}>
      <div 
        className="w-2 h-2 rounded-full mr-1"
        style={{ backgroundColor: teamColor.primary }}
      />
      <span className="text-xs text-primary-black-500 dark:text-primary-black-400">{team}</span>
    </div>
  )
} 