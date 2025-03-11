"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast.error("Please enter your email address")
      return
    }
    
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      
      if (error) {
        toast.error(error.message)
        return
      }
      
      setSubmitted(true)
      toast.success("Password reset instructions sent to your email")
    } catch (error: any) {
      toast.error(error.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }
  
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Check Your Email</CardTitle>
            <CardDescription className="text-center">
              We've sent password reset instructions to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <p className="text-center mb-4">
              Please check your email inbox and follow the instructions to reset your password.
            </p>
            <p className="text-center text-sm text-muted-foreground mb-4">
              If you don't see the email, check your spam folder.
            </p>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => router.push('/auth')}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Instructions"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link 
            href="/auth" 
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
