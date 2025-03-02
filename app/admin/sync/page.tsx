"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

// API token should be fetched from environment in a real app
// For demo purposes, we're using a constant
const API_TOKEN = "2b6tTNGbvjjmKOxcx1ElR/7Vr5olIlRXyhLWbt5dhk0="

export default function SyncPage() {
  const [syncingTeams, setSyncingTeams] = useState(false)
  const [syncingPlayers, setSyncingPlayers] = useState(false)
  const [syncingSportsbooks, setSyncingSportsbooks] = useState(false)
  const [syncingMarkets, setSyncingMarkets] = useState(false)
  const [syncingPlayerHistory, setSyncingPlayerHistory] = useState(false)
  const [syncingFixtures, setSyncingFixtures] = useState(false)
  const [syncingOdds, setSyncingOdds] = useState(false)
  const [syncingPlayerOdds, setSyncingPlayerOdds] = useState(false)
  const [syncingCompletedFixtures, setSyncingCompletedFixtures] = useState(false)
  const [syncingFixtureResults, setSyncingFixtureResults] = useState(false)
  const [syncingCoordinator, setSyncingCoordinator] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTeamSync = async () => {
    setSyncingTeams(true)
    setError(null)
    try {
      const response = await fetch("/api/sync-teams", {
        method: "POST",
        headers: {
          "api-token": API_TOKEN
        }
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync teams")
      }

      toast.success(data.message)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sync teams"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSyncingTeams(false)
    }
  }

  const handlePlayerSync = async () => {
    setSyncingPlayers(true)
    setError(null)
    try {
      const response = await fetch("/api/sync-players", {
        method: "POST",
        headers: {
          "api-token": API_TOKEN
        }
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync players")
      }

      toast.success(data.message)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sync players"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSyncingPlayers(false)
    }
  }

  const handleSportsbookSync = async () => {
    setSyncingSportsbooks(true)
    setError(null)
    try {
      const response = await fetch("/api/sync-sportsbooks", {
        method: "POST",
        headers: {
          "api-token": API_TOKEN
        }
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync sportsbooks")
      }

      toast.success(data.message)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sync sportsbooks"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSyncingSportsbooks(false)
    }
  }

  const handleMarketSync = async () => {
    setSyncingMarkets(true)
    setError(null)
    try {
      const response = await fetch("/api/sync-markets", {
        method: "POST",
        headers: {
          "api-token": API_TOKEN
        }
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync markets")
      }

      toast.success(data.message)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sync markets"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSyncingMarkets(false)
    }
  }

  const handlePlayerHistorySync = async () => {
    setSyncingPlayerHistory(true)
    setError(null)
    try {
      const response = await fetch("/api/sync-player-history", {
        method: "POST",
        headers: {
          "api-token": API_TOKEN
        }
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync player history")
      }

      toast.success(data.message)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sync player history"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSyncingPlayerHistory(false)
    }
  }

  const handleFixtureSync = async () => {
    setSyncingFixtures(true)
    setError(null)
    try {
      const response = await fetch("/api/sync-fixtures", {
        method: "POST",
        headers: {
          "api-token": API_TOKEN
        }
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync fixtures")
      }

      toast.success(data.message)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sync fixtures"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSyncingFixtures(false)
    }
  }

  const handleOddsSync = async () => {
    setSyncingOdds(true)
    setError(null)
    try {
      const response = await fetch("/api/sync-odds", {
        method: "POST",
        headers: {
          "api-token": API_TOKEN
        }
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync odds")
      }

      toast.success(data.message)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sync odds"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSyncingOdds(false)
    }
  }

  const handlePlayerOddsSync = async () => {
    setSyncingPlayerOdds(true)
    setError(null)
    try {
      const response = await fetch("/api/sync-player-odds", {
        method: "POST",
        headers: {
          "api-token": API_TOKEN
        }
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync player odds")
      }

      toast.success(data.message)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sync player odds"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSyncingPlayerOdds(false)
    }
  }

  const handleCompletedFixturesSync = async () => {
    setSyncingCompletedFixtures(true)
    setError(null)
    try {
      const response = await fetch("/api/sync-fixtures-completed", {
        method: "POST",
        headers: {
          "api-token": API_TOKEN
        }
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync completed fixtures")
      }

      toast.success(data.message)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sync completed fixtures"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSyncingCompletedFixtures(false)
    }
  }

  const handleFixtureResultsSync = async () => {
    setSyncingFixtureResults(true)
    setError(null)
    try {
      const response = await fetch("/api/sync-fixture-results", {
        method: "POST",
        headers: {
          "api-token": API_TOKEN
        }
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync fixture results")
      }

      toast.success(data.message)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sync fixture results"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSyncingFixtureResults(false)
    }
  }

  const handleCoordinatorSync = async () => {
    setSyncingCoordinator(true)
    setError(null)
    try {
      const response = await fetch("/api/sync-coordinator", {
        method: "POST",
        headers: {
          "api-token": API_TOKEN
        }
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to run sync coordinator")
      }

      toast.success(data.message)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to run sync coordinator"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSyncingCoordinator(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Data Sync</CardTitle>
          <CardDescription>
            Sync NBA data from Optic Odds API to the database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Button onClick={handleTeamSync} disabled={syncingTeams}>
              {syncingTeams ? "Syncing Teams..." : "Sync Teams"}
            </Button>
            <Button onClick={handlePlayerSync} disabled={syncingPlayers}>
              {syncingPlayers ? "Syncing Players..." : "Sync Players"}
            </Button>
            <Button onClick={handleSportsbookSync} disabled={syncingSportsbooks}>
              {syncingSportsbooks ? "Syncing Sportsbooks..." : "Sync Sportsbooks"}
            </Button>
            <Button onClick={handleMarketSync} disabled={syncingMarkets}>
              {syncingMarkets ? "Syncing Markets..." : "Sync Markets"}
            </Button>
            <Button onClick={handlePlayerHistorySync} disabled={syncingPlayerHistory}>
              {syncingPlayerHistory ? "Syncing Player History..." : "Sync Player History"}
            </Button>
            <Button onClick={handleFixtureSync} disabled={syncingFixtures}>
              {syncingFixtures ? "Syncing Fixtures..." : "Sync Fixtures"}
            </Button>
            <Button onClick={handleOddsSync} disabled={syncingOdds}>
              {syncingOdds ? "Syncing Odds..." : "Sync Odds"}
            </Button>
            <Button onClick={handlePlayerOddsSync} disabled={syncingPlayerOdds}>
              {syncingPlayerOdds ? "Syncing Player Props..." : "Sync Player Props"}
            </Button>
            <Button onClick={handleCompletedFixturesSync} disabled={syncingCompletedFixtures}>
              {syncingCompletedFixtures ? "Syncing Completed Fixtures..." : "Sync Completed Fixtures"}
            </Button>
            <Button onClick={handleFixtureResultsSync} disabled={syncingFixtureResults}>
              {syncingFixtureResults ? "Syncing Fixture Results..." : "Sync Fixture Results"}
            </Button>
            <Button onClick={handleCoordinatorSync} disabled={syncingCoordinator} variant="outline" className="col-span-2">
              {syncingCoordinator ? "Running Sync Coordinator..." : "Run Sync Coordinator"}
            </Button>
          </div>
          {error && (
            <div className="text-sm text-red-500">
              Error: {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

