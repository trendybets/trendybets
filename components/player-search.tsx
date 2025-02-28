"use client"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export function PlayerSearch() {
  return (
    <div className="relative w-full md:w-[300px]">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Search for a player..." className="pl-8" />
    </div>
  )
}

