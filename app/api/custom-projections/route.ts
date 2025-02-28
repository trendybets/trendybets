import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = 'https://hvegilvwwvdmivnphlyo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWdpbHZ3d3ZkbWl2bnBobHlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTY1NjgxNCwiZXhwIjoyMDU1MjMyODE0fQ.6GV2B4ciNiMGOnnRXOMznwD1aNqYUQmHxuuWrdc3U44';

// Initialize Supabase client with service role key to bypass RLS policies
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function GET(request: NextRequest) {
  try {
    console.log("Custom projections API route called");
    
    // Fetch all custom projections
    const { data, error } = await supabase
      .from('custom_projections')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching custom projections:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Return the projections as JSON
    return NextResponse.json({ 
      success: true, 
      count: data.length,
      data 
    });
  } catch (error: any) {
    console.error("Exception in custom projections API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 