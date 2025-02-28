import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  try {
    // Get endpoints that need to be synced
    const { data: schedules, error } = await supabase
      .from("sync_schedule")
      .select("*")
      .eq("is_active", true)
      .lt("next_run", new Date().toISOString())

    if (error) throw error

    for (const schedule of schedules) {
      try {
        // Call the appropriate sync endpoint
        await syncEndpoint(schedule.endpoint)
        
        // Update next run time
        await supabase
          .from("sync_schedule")
          .update({
            last_run: new Date().toISOString(),
            next_run: new Date(Date.now() + parseDuration(schedule.frequency))
          })
          .eq("id", schedule.id)
      } catch (error) {
        console.error(`Failed to sync ${schedule.endpoint}:`, error)
      }
    }

    return NextResponse.json({ 
      message: `Completed sync for ${schedules.length} endpoints` 
    })
  } catch (error) {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}

// Helper to parse Postgres interval to milliseconds
function parseDuration(interval: string): number {
  const [amount, unit] = interval.split(' ')
  const value = parseInt(amount)
  
  switch (unit) {
    case 'minutes':
      return value * 60 * 1000
    case 'hours':
      return value * 60 * 60 * 1000
    case 'days':
      return value * 24 * 60 * 60 * 1000
    default:
      throw new Error(`Unsupported interval unit: ${unit}`)
  }
}

async function syncEndpoint(endpoint: string, retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`/api/sync-${endpoint}`, { 
        method: 'POST',
        timeout: 60000 // 1 minute timeout
      })
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return true
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for ${endpoint}:`, error)
      if (i === retries - 1) return false
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))) // Exponential backoff
    }
  }
  return false
} 