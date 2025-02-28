import { Metadata } from 'next'
import TrendyGamesView from '@/app/components/trendy-games-view'

export const metadata: Metadata = {
  title: 'Trendy Games | TrendyBets',
  description: 'View the best odds across multiple sportsbooks for upcoming games',
}

export default function TrendyGamesPage() {
  return <TrendyGamesView />
} 