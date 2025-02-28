"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import TrendyGamesView from './components/trendy-games-view'
import { LoginPopup } from './components/auth/login-popup'
import { Button } from "@/components/ui/button"

export default function Home() {
  const [showLoginPopup, setShowLoginPopup] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user || null
      setUser(currentUser)
      
      // Automatically show login popup if user is not logged in
      if (!currentUser) {
        setShowLoginPopup(true)
      }
      
      setLoading(false)
    }
    
    checkUser()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])
  
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">TrendyBets</h1>
          <div>
            {loading ? (
              <Button disabled variant="outline">Loading...</Button>
            ) : user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700">Welcome, {user.user_metadata?.username || user.email}</span>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    await supabase.auth.signOut()
                  }}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowLoginPopup(true)}>
                Sign In / Register
              </Button>
            )}
          </div>
        </div>
      </header>
      
      <TrendyGamesView />
      
      <LoginPopup 
        isOpen={showLoginPopup} 
        onClose={() => setShowLoginPopup(false)} 
      />
    </main>
  )
}
