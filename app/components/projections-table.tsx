'use client'

import { useEffect, useState, useRef } from 'react'
import { PlayerData } from '../types'
import { calculateProjection, getAllCustomProjections } from '../lib/projections'
import { createClient } from '@supabase/supabase-js'

interface ProjectionsTableProps {
  data: PlayerData[]
  hasMore?: boolean
  onLoadMore?: () => void
  isLoading?: boolean
}

interface CustomProjection {
  player_name: string
  stat_type: string
  projected_value: number
  confidence: number
  recommendation: string
  edge: number
}

interface Sportsbook {
  id: string
  name: string
  logo: string
}

// Sort directions
type SortDirection = 'asc' | 'desc' | null;

// Helper function to normalize stat types for display
function normalizeStatType(statType: string): string {
  if (statType.toLowerCase() === 'total_rebounds') {
    return 'Rebounds';
  }
  // Capitalize first letter
  return statType.charAt(0).toUpperCase() + statType.slice(1);
}

export function ProjectionsTable({ data, hasMore = false, onLoadMore, isLoading = false }: ProjectionsTableProps) {
  const [customProjections, setCustomProjections] = useState<CustomProjection[]>([])
  const [loading, setLoading] = useState(true)
  const [sportsbookLogo, setSportsbookLogo] = useState<string | null>(null)
  const [edgeSortDirection, setEdgeSortDirection] = useState<SortDirection>(null)
  const [selectedStatType, setSelectedStatType] = useState<string | null>(null)
  const loaderRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (!hasMore || !onLoadMore || isLoading || loading) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.5 }
    );
    
    const currentLoaderRef = loaderRef.current;
    if (currentLoaderRef) {
      observer.observe(currentLoaderRef);
    }
    
    return () => {
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef);
      }
    };
  }, [hasMore, onLoadMore, isLoading, loading]);

  // Fetch custom projections and sportsbook logo on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        console.log('Fetching custom projections...');
        const projections = await getAllCustomProjections();
        console.log(`Fetched ${projections.length} custom projections`);
        setCustomProjections(projections);

        // Fetch DraftKings logo from sportsbook table
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hvegilvwwvdmivnphlyo.supabase.co';
        const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWdpbHZ3d3ZkbWl2bnBobHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY3MDU4OTIsImV4cCI6MjAzMjI4MTg5Mn0.bIhCn1cQgH0kDldI-9z8OJHPPu0SXqAEOJnj9V90JqY';
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        const { data: sportsbookData, error: sportsbookError } = await supabase
          .from('sportsbook')
          .select('logo')
          .eq('name', 'DraftKings')
          .single();
          
        if (sportsbookError) {
          console.error('Error fetching sportsbook logo:', sportsbookError);
        } else if (sportsbookData?.logo) {
          setSportsbookLogo(sportsbookData.logo);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [data]);

  // Process all projections, prioritizing custom ones
  const projections = data.map(player => {
    // First check if we have a custom projection for this player and stat
    const playerName = player.player.name.toLowerCase();
    const statType = player.stat_type.toLowerCase();
    
    // Find custom projection with case-insensitive matching
    // Also handle the case where database has "total_rebounds" but frontend expects "rebounds"
    const customProjection = customProjections.find(
      cp => cp.player_name.toLowerCase() === playerName && 
           (cp.stat_type.toLowerCase() === statType || 
            (statType === 'rebounds' && cp.stat_type.toLowerCase() === 'total_rebounds'))
    );

    if (customProjection) {
      console.log(`Found custom projection for ${playerName} - ${customProjection.stat_type}`);
      
      // Determine recommendation based on line vs projection comparison
      const recommendation = customProjection.projected_value < player.line ? 'UNDER' : 'OVER';
      
      // Calculate edge as absolute difference
      const edgeValue = Math.abs(customProjection.projected_value - player.line);
      const edgePercentage = player.line > 0 ? (edgeValue / player.line * 100).toFixed(1) + '%' : '0%';
      
      // Store the numeric edge value for sorting
      const numericEdge = player.line > 0 ? (edgeValue / player.line * 100) : 0;
      
      return {
        ...player,
        // Use custom projection values with updated recommendation logic
        projection: {
          projectedValue: customProjection.projected_value,
          confidenceScore: customProjection.confidence, // Keep for sorting but don't display
          recommendation: recommendation,
          edge: edgePercentage,
          numericEdge: numericEdge, // Store numeric value for sorting
          isCustom: true,
          originalStatType: customProjection.stat_type // Store the original stat type from the database
        }
      }
    }

    // Fallback to calculated projection with updated logic
    const calculatedValues = calculateProjection(
      // Safely access nested properties with fallbacks to 0
      {
        points: player.averages?.points?.season || 0,
        assists: player.averages?.assists?.season || 0, 
        rebounds: player.averages?.rebounds?.season || 0
      },
      // Safely access nested hit_rates with fallbacks to 0
      {
        points: player.hit_rates?.points?.season || 0,
        assists: player.hit_rates?.assists?.season || 0,
        rebounds: player.hit_rates?.rebounds?.season || 0
      },
      player.current_streak || 0,
      player.line
    );
    
    // Override the recommendation based on new logic
    const recommendation = calculatedValues.projectedValue < player.line ? 'UNDER' : 'OVER';
    
    // Calculate edge as absolute difference
    const edgeValue = Math.abs(calculatedValues.projectedValue - player.line);
    const edgePercentage = player.line > 0 ? (edgeValue / player.line * 100).toFixed(1) + '%' : '0%';
    
    // Store the numeric edge value for sorting
    const numericEdge = player.line > 0 ? (edgeValue / player.line * 100) : 0;
    
    return {
      ...player,
      projection: {
        ...calculatedValues,
        recommendation: recommendation,
        edge: edgePercentage,
        numericEdge: numericEdge, // Store numeric value for sorting
        isCustom: false
      }
    }
  });

  // Only show custom projections
  let filteredProjections = projections.filter(p => p.projection.isCustom);
  
  // Apply stat type filter if selected
  if (selectedStatType) {
    filteredProjections = filteredProjections.filter(p => {
      const normalizedStatType = p.stat_type.toLowerCase();
      const normalizedSelectedType = selectedStatType.toLowerCase();
      
      // Handle special case for rebounds
      if (normalizedSelectedType === 'rebounds') {
        return normalizedStatType === 'rebounds' || 
               (p.projection.originalStatType && p.projection.originalStatType.toLowerCase() === 'total_rebounds');
      }
      
      return normalizedStatType === normalizedSelectedType;
    });
  }
  
  // Apply edge sorting if selected
  if (edgeSortDirection) {
    filteredProjections.sort((a, b) => {
      if (edgeSortDirection === 'asc') {
        return a.projection.numericEdge - b.projection.numericEdge;
      } else {
        return b.projection.numericEdge - a.projection.numericEdge;
      }
    });
  } else {
    // Default sort by confidence score
    filteredProjections.sort((a, b) => b.projection.confidenceScore - a.projection.confidenceScore);
  }
  
  // Toggle edge sort direction
  const toggleEdgeSort = () => {
    if (edgeSortDirection === null) {
      setEdgeSortDirection('desc');
    } else if (edgeSortDirection === 'desc') {
      setEdgeSortDirection('asc');
    } else {
      setEdgeSortDirection(null);
    }
  };
  
  // Get unique stat types for filter
  const statTypes = Array.from(new Set(
    projections
      .filter(p => p.projection.isCustom)
      .map(p => {
        // Use the frontend stat type for display
        if (p.projection.originalStatType && p.projection.originalStatType.toLowerCase() === 'total_rebounds') {
          return 'Rebounds';
        }
        return p.stat_type;
      })
  )).sort();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-lg shadow-md">
        <div className="p-4">
          <div className="flex items-center">
            <svg className="h-8 w-8 text-white mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Trendy Bets Projections</h2>
              <p className="text-xs text-blue-100 mt-0.5">Advanced analytics for smarter betting</p>
            </div>
          </div>
        </div>
        
        {/* Stat Type Dropdown Filter */}
        <div className="flex items-center gap-2 p-4">
          <span className="text-sm text-white">Filter by stat:</span>
          <div className="relative">
            <select
              value={selectedStatType || ''}
              onChange={(e) => setSelectedStatType(e.target.value || null)}
              className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              {statTypes.map(statType => (
                <option key={statType} value={statType}>
                  {statType}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 px-4 h-10">PLAYER</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 h-10">STAT</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 h-10">LINE</th>
                <th className="text-center text-xs font-medium text-gray-500 px-4 h-10">PROJECTION</th>
                <th 
                  className="text-left text-xs font-medium text-gray-500 px-4 h-10 cursor-pointer hover:bg-gray-100"
                  onClick={toggleEdgeSort}
                >
                  <div className="flex items-center">
                    EDGE
                    {edgeSortDirection === 'asc' && <span className="ml-1">↑</span>}
                    {edgeSortDirection === 'desc' && <span className="ml-1">↓</span>}
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 h-10">SPORTSBOOK</th>
                <th className="text-center text-xs font-medium text-gray-500 px-4 h-10">RECOMMENDATION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Loading projections...
                  </td>
                </tr>
              ) : filteredProjections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No custom projections available
                    {selectedStatType && ` for ${selectedStatType}`}
                  </td>
                </tr>
              ) : (
                filteredProjections.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        {item.player.image_url && (
                          <img 
                            src={item.player.image_url} 
                            alt={item.player.name}
                            className="h-8 w-8 rounded-full bg-gray-100"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-900">{item.player.name}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.player.team} • {item.player.position}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {item.projection.originalStatType && item.projection.originalStatType.toLowerCase() === 'total_rebounds' 
                        ? 'Rebounds' 
                        : normalizeStatType(item.stat_type)}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{item.line}</td>
                    <td className="px-4 py-2 text-gray-900 font-medium text-center">
                      {item.projection.projectedValue}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-sm ${
                        item.projection.recommendation === 'OVER' 
                          ? 'text-green-700 bg-green-50' 
                          : 'text-red-700 bg-red-50'
                      }`}>
                        {item.projection.edge}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center">
                        {sportsbookLogo ? (
                          <img 
                            src={sportsbookLogo} 
                            alt="DraftKings" 
                            className="h-5 mr-2"
                          />
                        ) : null}
                        <span className="text-gray-700">DraftKings</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        item.projection.recommendation === 'OVER'
                          ? 'text-green-700 bg-green-50'
                          : 'text-red-700 bg-red-50'
                      }`}>
                        {item.projection.recommendation}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Infinite Scroll Loader */}
          {hasMore && onLoadMore && (
            <div 
              ref={loaderRef} 
              className="py-4 flex justify-center items-center"
            >
              {isLoading || loading ? (
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              ) : (
                <div className="h-8 flex items-center justify-center text-sm text-gray-500">
                  Scroll for more
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 