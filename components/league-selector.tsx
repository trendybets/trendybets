"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const leagues = [
  {
    name: "NBA",
    logo: "/placeholder.svg?height=24&width=24",
  },
  {
    name: "NHL",
    logo: "/placeholder.svg?height=24&width=24",
  },
  {
    name: "NFL",
    logo: "/placeholder.svg?height=24&width=24",
  },
  {
    name: "MLB",
    logo: "/placeholder.svg?height=24&width=24",
  },
]

export function LeagueSelector() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-between">
          <div className="flex items-center gap-2">
            <Image
              src={leagues[0].logo || "/placeholder.svg"}
              alt={leagues[0].name}
              width={24}
              height={24}
              className="rounded-full"
            />
            <span>{leagues[0].name}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        {leagues.map((league) => (
          <DropdownMenuItem key={league.name}>
            <div className="flex w-full items-center gap-2">
              <Image
                src={league.logo || "/placeholder.svg"}
                alt={league.name}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span>{league.name}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

