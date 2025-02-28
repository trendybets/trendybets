import SyncButton from "@/components/sync-button"
import { CalendarIcon, TrendingUpIcon, ChartBarIcon, BarChart2Icon } from "lucide-react"

export default function SyncPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Data Sync</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Existing buttons */}
        <SyncButton
          title="Sync Player Props"
          description="Sync latest player props from sportsbooks"
          endpoint="/api/sync/player-props"
          icon={<TrendingUpIcon className="w-4 h-4" />}
        />

        <SyncButton
          title="Sync Player History"
          description="Sync player game history and stats"
          endpoint="/api/sync/player-history"
          icon={<ChartBarIcon className="w-4 h-4" />}
        />

        {/* New button for fixtures */}
        <SyncButton
          title="Sync Completed Fixtures"
          description="Sync completed NBA game results"
          endpoint="/api/sync-fixtures-completed"
          icon={<CalendarIcon className="w-4 h-4" />}
        />
      </div>
    </div>
  )
} 