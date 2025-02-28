import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const SUPABASE_URL = 'https://hvegilvwwvdmivnphlyo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWdpbHZ3d3ZkbWl2bnBobHlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTY1NjgxNCwiZXhwIjoyMDU1MjMyODE0fQ.6GV2B4ciNiMGOnnRXOMznwD1aNqYUQmHxuuWrdc3U44';

export async function POST(request: NextRequest) {
  try {
    console.log("Upload projections API route called");
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Check if request is multipart form data
    const contentType = request.headers.get('content-type') || '';
    
    let data;
    if (contentType.includes('application/json')) {
      // Handle JSON upload
      data = await request.json();
    } else if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      
      // Read the file content
      const fileContent = await file.text();
      
      try {
        // Try to parse as JSON
        data = JSON.parse(fileContent);
      } catch (e) {
        // Try to parse as CSV
        data = parseCSV(fileContent);
      }
    } else {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
    }
    
    // Validate data structure
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Data must be an array of projections" }, { status: 400 });
    }
    
    // Process and store each projection
    const timestamp = new Date().toISOString();
    let processed = 0;
    
    for (const item of data) {
      // Format and validate each projection
      const projection = formatProjection(item);
      
      if (!projection) {
        console.warn("Skipping invalid projection item:", item);
        continue;
      }
      
      // Store in the custom_projections table
      const { error } = await supabase
        .from("custom_projections")
        .upsert({
          player_id: projection.player_id || null,
          player_name: projection.player_name,
          stat_type: projection.stat_type,
          line: projection.line,
          projected_value: projection.projected_value,
          confidence: projection.confidence,
          recommendation: projection.recommendation,
          edge: projection.edge,
          created_at: timestamp,
          metadata: projection.metadata || {}
        }, {
          onConflict: 'player_name,stat_type',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error("Error storing projection:", error);
        continue;
      }
      
      processed++;
    }
    
    return NextResponse.json({
      success: true,
      message: `Processed ${processed} projections`,
      timestamp
    });
    
  } catch (error) {
    console.error("Upload projections error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}

// Helper function to parse CSV data
function parseCSV(csv: string) {
  const lines = csv.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).filter(line => line.trim()).map(line => {
    const values = line.split(',').map(v => v.trim());
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i];
      return obj;
    }, {} as Record<string, string>);
  });
}

// Helper function to format and validate a projection item
function formatProjection(item: any) {
  // Basic required fields
  if (!item.player_name || !item.stat_type) {
    return null;
  }
  
  // Standardize keys and convert types
  return {
    player_id: item.player_id || null,
    player_name: item.player_name || item.name || "",
    stat_type: item.stat_type || item.prop || item.stat || "",
    line: parseFloat(item.line || item.prop_line || "0") || 0,
    projected_value: parseFloat(item.projected_value || item.projection || "0") || 0,
    confidence: parseFloat(item.confidence || item.confidence_score || "0") || 0,
    recommendation: (item.recommendation || item.bet || item.pick || "").toUpperCase(),
    edge: parseFloat(item.edge || "0") || 0,
    metadata: {
      source: item.source || "custom_upload",
      notes: item.notes || "",
      original_data: item
    }
  };
} 