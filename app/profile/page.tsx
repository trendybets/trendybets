import { createServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your profile information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <strong>Email:</strong> {session.user.email}
            </p>
            <p>
              <strong>User ID:</strong> {session.user.id}
            </p>
            <p>
              <strong>Last Sign In:</strong> {session.user.last_sign_in_at ? new Date(session.user.last_sign_in_at).toLocaleString() : 'Never'}
            </p>
            {profile && (
              <>
                <p>
                  <strong>Username:</strong> {profile.username || "Not set"}
                </p>
                <p>
                  <strong>Avatar URL:</strong> {profile.avatar_url || "Not set"}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

