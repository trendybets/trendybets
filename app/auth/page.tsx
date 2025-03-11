"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginForm } from "../components/auth/login-form"
import { SignUpForm } from "../components/auth/signup-form"

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login")
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      // If user is already logged in, redirect to home page
      if (session?.user) {
        router.push('/')
      }
      
      setLoading(false)
    }
    
    checkUser()
  }, [router, supabase.auth])
  
  const handleSuccess = () => {
    router.push('/')
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-black-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">TrendyBets</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account or create a new one to track your bets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="login" 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as "login" | "signup")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <LoginForm onSuccess={handleSuccess} />
            </TabsContent>
            
            <TabsContent value="signup">
              <SignUpForm 
                onSuccess={handleSuccess} 
                onTabChange={(tab) => setActiveTab(tab as "login" | "signup")} 
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
