"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@supabase/supabase-js"
import { clientEnv } from "@/lib/env"
import type { Database } from "@/types/supabase"
import Image from "next/image"

const ALLOWED_SPORTSBOOKS = [
  'DraftKings',
  'BetMGM',
  'bet365',
  'Caesars'
]

interface SportsbookSelectProps {
  value: string | null
  onChange: (value: string) => void
}

export function SportsbookSelect({ value, onChange }: SportsbookSelectProps) {
  const [sportsbooks, setSportsbooks] = useState<Database['public']['Tables']['sportsbook']['Row'][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSportsbooks() {
      try {
        const supabase = createClient<Database>(
          clientEnv.SUPABASE_URL,
          clientEnv.SUPABASE_ANON_KEY
        )

        const { data, error } = await supabase
          .from('sportsbook')
          .select('*')
          .eq('is_active', true)
          .in('name', ALLOWED_SPORTSBOOKS)
          .order('name')

        if (error) throw error
        setSportsbooks(data)
      } catch (e) {
        console.error('Error loading sportsbooks:', e)
        setError(e instanceof Error ? e.message : 'Failed to load sportsbooks')
      } finally {
        setLoading(false)
      }
    }

    loadSportsbooks()
  }, [])

  if (loading) return null
  if (error) return <div className="text-red-500 text-sm">Error loading sportsbooks</div>

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select Sportsbook" />
      </SelectTrigger>
      <SelectContent>
        {sportsbooks.map((sportsbook) => (
          <SelectItem key={sportsbook.name} value={sportsbook.name}>
            <div className="flex items-center gap-2">
              <Image
                src={sportsbook.logo || '/placeholder-sportsbook.png'}
                alt={sportsbook.name}
                width={24}
                height={24}
                className="object-contain"
              />
              {sportsbook.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export async function getSportsbooks() {
  const supabase = createClient<Database>(
    clientEnv.SUPABASE_URL,
    clientEnv.SUPABASE_ANON_KEY
  )
  
  const { data, error } = await supabase
    .from('sportsbook')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching sportsbooks:', error)
    return []
  }

  return data
} 