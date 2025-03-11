"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import TrendyGamesView from './components/trendy-games-view'
import { Button } from "@/app/components/ui/Button"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user || null
      setUser(currentUser)
      
      // Redirect to auth page if user is not logged in
      if (!currentUser) {
        router.push('/auth')
      }
      
      setLoading(false)
    }
    
    checkUser()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null
      setUser(currentUser)
      
      // Redirect to auth page if user signs out
      if (!currentUser) {
        router.push('/auth')
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth, router])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  // Only render the main content if the user is logged in
  if (!user) {
    return null
  }
  
  return (
    <main className="min-h-screen bg-primary-black-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-black-900">TrendyBets</h1>
          <div>
            {user && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-primary-black-700 hidden sm:inline">Welcome, {user.user_metadata?.username || user.email}</span>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    await supabase.auth.signOut()
                  }}
                >
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <TrendyGamesView />
    </main>
  )
}
