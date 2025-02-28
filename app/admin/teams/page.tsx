import { createServerClient } from "@/lib/supabase-server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function TeamsPage() {
  const supabase = createServerClient()
  const { data: teams, error } = await supabase.from("teams").select("*")

  if (error) {
    console.error("Error fetching teams:", error)
    return <div>Error loading teams</div>
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>NBA Teams</CardTitle>
          <CardDescription>List of synced NBA teams</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {teams.map((team) => (
              <li key={team.id} className="flex justify-between">
                <span>{team.name}</span>
                <span className="text-muted-foreground">ID: {team.id}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

