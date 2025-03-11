"use client"

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface SignUpFormProps {
  onSuccess: () => void
  onTabChange?: (tab: string) => void
}

export function SignUpForm({ onSuccess, onTabChange }: SignUpFormProps) {
  const [loading, setLoading] = useState(false)
  
  // Form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const supabase = createClientComponentClient()
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!firstName) newErrors.firstName = "First name is required"
    if (!lastName) newErrors.lastName = "Last name is required"
    
    if (!username) {
      newErrors.username = "Username is required"
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    }
    
    if (!email) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid"
    }
    
    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    try {
      console.log("Starting signup process...")
      const redirectUrl = `${window.location.origin}/api/auth/callback`
      console.log("Redirect URL:", redirectUrl)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            username,
            phone,
          },
        },
      })
      
      console.log("Signup response:", { data, error })
      
      if (error) {
        toast.error(error.message)
        return
      }
      
      toast.success("Account created! Please check your email to confirm your account.")
      
      // Switch to login tab if provided
      if (onTabChange) {
        onTabChange("login")
      }
      
      onSuccess()
    } catch (error: any) {
      console.error("Signup error:", error)
      toast.error(error.message || "An error occurred during signup")
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <form onSubmit={handleSignup} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first-name">First Name</Label>
          <Input
            id="first-name"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={errors.firstName ? "border-red-500" : ""}
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm">{errors.firstName}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="last-name">Last Name</Label>
          <Input
            id="last-name"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={errors.lastName ? "border-red-500" : ""}
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm">{errors.lastName}</p>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          placeholder="johndoe123"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={errors.username ? "border-red-500" : ""}
        />
        {errors.username && (
          <p className="text-red-500 text-sm">{errors.username}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={errors.email ? "border-red-500" : ""}
        />
        {errors.email && (
          <p className="text-red-500 text-sm">{errors.email}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="(123) 456-7890"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={errors.password ? "border-red-500" : ""}
        />
        {errors.password && (
          <p className="text-red-500 text-sm">{errors.password}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={errors.confirmPassword ? "border-red-500" : ""}
        />
        {errors.confirmPassword && (
          <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
        )}
      </div>
      
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating Account..." : "Create Account"}
      </Button>
    </form>
  )
}
