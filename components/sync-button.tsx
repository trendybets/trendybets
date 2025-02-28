"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { LucideIcon } from "lucide-react"

interface SyncButtonProps {
  title: string
  description: string
  endpoint: string
  icon?: React.ReactNode
}

export default function SyncButton({ title, description, endpoint, icon }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Sync failed')
      }
      
      const data = await response.json()
      toast.success(data.message)
    } catch (error) {
      toast.error('Failed to sync data')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="absolute top-4 right-4"
          variant="secondary"
          size="sm"
        >
          {isSyncing ? "Syncing..." : "Sync"}
        </Button>
      </CardHeader>
    </Card>
  )
} 