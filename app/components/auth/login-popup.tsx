"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoginForm } from "./login-form"
import { SignUpForm } from "./signup-form"

interface LoginPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginPopup({ isOpen, onClose }: LoginPopupProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("signup")
  
  const handleSuccess = () => {
    onClose()
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Welcome to TrendyBets</DialogTitle>
          <DialogDescription>
            Sign in to your account or create a new one to track your bets and get personalized recommendations.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="signup" value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
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
      </DialogContent>
    </Dialog>
  )
}