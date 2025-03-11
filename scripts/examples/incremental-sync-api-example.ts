// Example of how to update your existing API routes to support incremental updates
// This is meant as a template, not to be used directly

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

export async function POST(request: Request) {
  console.log("API route called")
  
  // Parse request body to get incremental sync parameters
  let lastSyncDate: string | null = null;
  let isAutomated = false;
  let isScheduled = false;
  
  try {
    const body = await request.json();
    
    // Check if this is an automated scheduled request from the scheduler
    isAutomated = body.automated === true;
    isScheduled = body.scheduled === true;
    
    // Get the timestamp of the last successful run if available
    if (body.lastSyncTime) {
      lastSyncDate = body.lastSyncTime;
      console.log(`Using provided lastSyncTime: ${lastSyncDate}`);
    }
  } catch (e) {
    // No JSON body or parsing error, continue with default behavior
    console.log("No request body or invalid JSON");
  }
  
  // If no lastSyncDate was provided, get it from your database
  if (!lastSyncDate) {
    lastSyncDate = await getLastSyncTimeFromDatabase();
    console.log(`Using database lastSyncTime: ${lastSyncDate || 'none'}`);
  }
  
  try {
    // Use the lastSyncDate to fetch only new/updated data
    // Example: fetching only players updated since lastSyncDate
    let query = "SELECT * FROM players";
    
    if (lastSyncDate) {
      query += ` WHERE updated_at > '${lastSyncDate}'`;
    }
    
    console.log(`Running query: ${query}`);
    
    // Process data incrementally
    const processedCount = 42; // Your actual processing logic
    
    // Update the last sync time in your database
    await updateLastSyncTime(new Date().toISOString(), processedCount);
    
    // Return a consistent response format for both manual and automated syncs
    return NextResponse.json({
      success: true,
      message: `Sync completed successfully`,
      processed: processedCount,
      isIncremental: !!lastSyncDate,
      since: lastSyncDate || "all data",
      automated: isAutomated,
      scheduled: isScheduled
    });
  } catch (error) {
    console.error('Error in sync process:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      automated: isAutomated,
      scheduled: isScheduled
    }, { status: 500 });
  }
}

// Example function to get the last sync time from your database
async function getLastSyncTimeFromDatabase(): Promise<string | null> {
  // Your logic to retrieve the last successful sync time
  // For example:
  
  /* 
  const { data } = await supabase
    .from("sync_log")
    .select("completed_at")
    .eq("sync_type", "your_sync_type")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1);
    
  return data?.[0]?.completed_at || null;
  */
  
  // For this example, we'll just return a date from yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString();
}

// Example function to update the last sync time in your database
async function updateLastSyncTime(syncTime: string, recordsProcessed: number): Promise<void> {
  // Your logic to store the sync time
  // For example:
  
  /*
  await supabase
    .from("sync_log")
    .insert({
      sync_type: "your_sync_type",
      started_at: startTime,
      completed_at: syncTime,
      status: "completed",
      records_processed: recordsProcessed
    });
  */
  
  console.log(`Updated last sync time to ${syncTime} with ${recordsProcessed} records processed`);
} 