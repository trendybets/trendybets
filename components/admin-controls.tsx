import { Button } from "@/components/ui/button"
import { syncTeams, syncPlayerOdds, syncFixturesCompleted } from "@/lib/sync"
import { toast } from "sonner"

export function AdminControls() {
  const handleSyncTeams = async () => {
    try {
      await syncTeams()
      toast.success("Teams synced successfully")
    } catch (error) {
      toast.error("Failed to sync teams")
    }
  }

  const handleSyncPlayerOdds = async () => {
    try {
      await syncPlayerOdds()
      toast.success("Player props synced successfully")
    } catch (error) {
      toast.error("Failed to sync player props")
    }
  }

  const handleSyncFixtures = async () => {
    try {
      await syncFixturesCompleted()
      toast.success("Completed fixtures synced successfully")
    } catch (error) {
      toast.error("Failed to sync completed fixtures")
    }
  }

  return (
    <div className="p-6 bg-black/40 rounded-lg">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Data Sync</h2>
          <p className="text-sm text-white/60 mb-4">Sync NBA data from Optic Odds API to the database</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSyncTeams} variant="secondary">
            Sync Teams
          </Button>
          <Button variant="secondary">
            Sync Players
          </Button>
          <Button variant="secondary">
            Sync Sportsbooks
          </Button>
          <Button variant="secondary">
            Sync Markets
          </Button>
          <Button variant="secondary">
            Sync Player History
          </Button>
          <Button 
            onClick={handleSyncFixtures} 
            variant="secondary"
          >
            Sync Fixtures
          </Button>
          <Button variant="secondary">
            Sync Odds
          </Button>
          <Button 
            onClick={handleSyncPlayerOdds} 
            variant="secondary"
          >
            Sync Player Props
          </Button>
        </div>
      </div>
    </div>
  )
} 