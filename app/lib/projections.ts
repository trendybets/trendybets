import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hvegilvwwvdmivnphlyo.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWdpbHZ3d3ZkbWl2bnBobHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY3MDU4OTIsImV4cCI6MjAzMjI4MTg5Mn0.bIhCn1cQgH0kDldI-9z8OJHPPu0SXqAEOJnj9V90JqY';

// Initialize Supabase client
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// Interface for the averages object
interface Averages {
  last5?: number;
  last10?: number;
  season?: number;
  [key: string]: number | undefined;
}

// Interface for the hit rates object
interface HitRates {
  last5?: number;
  last10?: number;
  season?: number;
  [key: string]: number | undefined;
}

// Interface for the projection result
interface ProjectionResult {
  projectedValue: number;
  edge: string;
  recommendation: 'OVER' | 'UNDER';
  confidenceScore: number;
}

// Custom projection from the database
interface CustomProjection {
  player_name: string;
  stat_type: string;
  line: number;
  projected_value: number;
  confidence: number;
  recommendation: string;
  edge: number;
}

/**
 * Calculate projection based on averages, hit rates, streak, and line
 */
export function calculateProjection(
  averages: Averages,
  hitRates: HitRates,
  currentStreak: number = 0,
  line: number
): ProjectionResult {
  // Default weights
  const weights = {
    last5: 0.5,
    last10: 0.3,
    season: 0.2
  };

  // Calculate weighted average
  let weightedSum = 0;
  let totalWeight = 0;

  if (averages.last5 !== undefined) {
    weightedSum += averages.last5 * weights.last5;
    totalWeight += weights.last5;
  }

  if (averages.last10 !== undefined) {
    weightedSum += averages.last10 * weights.last10;
    totalWeight += weights.last10;
  }

  if (averages.season !== undefined) {
    weightedSum += averages.season * weights.season;
    totalWeight += weights.season;
  }

  const projectedValue = totalWeight > 0 
    ? parseFloat((weightedSum / totalWeight).toFixed(1))
    : 0;

  // Calculate edge as absolute difference
  const edge = Math.abs(projectedValue - line);
  const edgePercentage = line > 0 ? (edge / line * 100).toFixed(1) + '%' : '0%';

  // Determine recommendation based on comparison
  const recommendation = projectedValue < line ? 'UNDER' : 'OVER';

  // Calculate confidence score based on hit rates and streak
  let confidenceBase = 50; // Base confidence

  // Factor in hit rates
  if (hitRates.last5 !== undefined) {
    confidenceBase += (hitRates.last5 - 0.5) * 20;
  }

  if (hitRates.last10 !== undefined) {
    confidenceBase += (hitRates.last10 - 0.5) * 15;
  }

  if (hitRates.season !== undefined) {
    confidenceBase += (hitRates.season - 0.5) * 10;
  }

  // Factor in streak (positive for OVER, negative for UNDER)
  const streakFactor = recommendation === 'OVER' ? currentStreak : -currentStreak;
  confidenceBase += streakFactor * 2;

  // Factor in edge size
  confidenceBase += Math.min(edge * 5, 15);

  // Cap confidence between 30-95%
  const confidenceScore = Math.min(Math.max(Math.round(confidenceBase), 30), 95);

  return {
    projectedValue,
    edge: edgePercentage,
    recommendation,
    confidenceScore
  };
}

/**
 * Get custom projections for a specific player and stat type
 */
export async function getCustomProjection(
  playerName: string, 
  statType: string
): Promise<CustomProjection | null> {
  try {
    const { data, error } = await supabase
      .from('custom_projections')
      .select('*')
      .eq('player_name', playerName)
      .eq('stat_type', statType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data as unknown as CustomProjection;
  } catch (error) {
    console.error('Error fetching custom projection:', error);
    return null;
  }
}

/**
 * Get all custom projections
 */
export async function getAllCustomProjections(): Promise<CustomProjection[]> {
  try {
    // Use the API endpoint instead of direct Supabase access
    const response = await fetch('/api/custom-projections');
    
    if (!response.ok) {
      // If the request was not successful, throw an error
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Check if the API returned success and data
    if (!result.success || !result.data) {
      console.error('API returned error or no data:', result);
      return [];
    }
    
    // Return the data from the API response
    return result.data as CustomProjection[];
  } catch (error) {
    console.error('Error fetching all custom projections:', error);
    // Fall back to direct Supabase access if API fails
    try {
      const { data, error: supabaseError } = await supabase
        .from('custom_projections')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (supabaseError || !data) {
        return [];
      }
      
      return data as unknown as CustomProjection[];
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return [];
    }
  }
} 