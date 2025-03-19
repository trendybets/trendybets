'use client'

import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { motion } from 'framer-motion';
import { GameStats } from '../types';

// Register Chart.js components
Chart.register(...registerables, annotationPlugin);

interface DistributionGraphProps {
  games: GameStats[];
  statType: string;
  line: number;
  title?: string;
  className?: string;
}

const DistributionGraph = ({ 
  games, 
  statType, 
  line,
  title = 'Performance Distribution',
  className = ''
}: DistributionGraphProps) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  // Get the correct stat value based on stat type
  const getStatValue = (game: GameStats, type: string): number => {
    switch(type.toLowerCase()) {
      case 'points':
        return game.points;
      case 'assists':
        return game.assists;
      case 'rebounds':
        return game.total_rebounds;
      default:
        return 0;
    }
  };
  
  // Calculate distribution data
  const calculateDistribution = () => {
    const values = games.map(game => getStatValue(game, statType));
    
    if (values.length === 0) {
      return {
        labels: ['No Data'],
        data: [0],
        bucketMap: {}
      };
    }
    
    const min = Math.floor(Math.min(...values));
    const max = Math.ceil(Math.max(...values));
    const range = max - min;
    
    // Make sure we have at least 1 as bucket size
    const bucketSize = Math.max(1, Math.ceil(range / 8));
    
    const buckets: Record<string, number> = {};
    const bucketMap: Record<string, number[]> = {}; // Maps bucket keys to indexes of games
    
    // Initialize buckets
    for (let i = min; i <= max; i += bucketSize) {
      const bucketKey = `${i}-${i + bucketSize - 1}`;
      buckets[bucketKey] = 0;
      bucketMap[bucketKey] = [];
    }
    
    // Fill buckets
    values.forEach((value, index) => {
      const bucketIndex = Math.floor((value - min) / bucketSize);
      const bucketStart = min + bucketIndex * bucketSize;
      const bucketKey = `${bucketStart}-${bucketStart + bucketSize - 1}`;
      
      if (buckets[bucketKey] !== undefined) {
        buckets[bucketKey]++;
        bucketMap[bucketKey].push(index);
      }
    });
    
    return {
      labels: Object.keys(buckets),
      data: Object.values(buckets),
      bucketMap
    };
  };
  
  const distribution = calculateDistribution();
  
  useEffect(() => {
    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    if (!chartRef.current) return;
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    // Find which bucket contains the line
    const lineBucket = distribution.labels.findIndex(label => {
      const [min, max] = label.split('-').map(Number);
      return line >= min && line <= max;
    });
    
    // Create new chart
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: distribution.labels,
        datasets: [
          {
            label: 'Frequency',
            data: distribution.data,
            backgroundColor: distribution.labels.map((label) => {
              const [min, max] = label.split('-').map(Number);
              const midpoint = (min + max) / 2;
              return midpoint > line ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
            }),
            borderColor: distribution.labels.map((label) => {
              const [min, max] = label.split('-').map(Number);
              const midpoint = (min + max) / 2;
              return midpoint > line ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)';
            }),
            borderWidth: 1,
            borderRadius: 4,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 800,
          easing: 'easeOutQuart'
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Games',
              font: {
                size: 11
              }
            },
            ticks: {
              stepSize: 1,
              font: {
                size: 10
              }
            }
          },
          x: {
            title: {
              display: true,
              text: statType,
              font: {
                size: 11
              }
            },
            ticks: {
              font: {
                size: 10
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              title: (tooltipItems) => {
                return `${statType} Range: ${tooltipItems[0].label}`;
              },
              label: (tooltipItem) => {
                return `Games: ${tooltipItem.raw}`;
              },
              afterLabel: (tooltipItem) => {
                const [min, max] = tooltipItem.label.split('-').map(Number);
                const midpoint = (min + max) / 2;
                const lineText = midpoint > line ? 'Over' : 'Under';
                return `${lineText} the line (${line})`;
              }
            }
          },
          annotation: {
            annotations: {
              line1: {
                type: 'line',
                yMin: 0,
                yMax: Math.max(...distribution.data) + 1,
                xMin: lineBucket !== -1 ? lineBucket : undefined,
                xMax: lineBucket !== -1 ? lineBucket : undefined,
                borderColor: 'rgba(59, 130, 246, 0.8)',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                  content: `Line: ${line}`,
                  display: true,
                  position: 'start',
                  backgroundColor: 'rgba(59, 130, 246, 0.8)',
                  color: 'white',
                  font: {
                    size: 10,
                    weight: 'bold'
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [distribution, line, statType]);
  
  // Calculate overall stats
  const overCount = games.filter(game => getStatValue(game, statType) > line).length;
  const underCount = games.length - overCount;
  const hitRate = games.length > 0 ? (overCount / games.length) * 100 : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm ${className}`}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
        <div className="text-sm font-medium">
          <span className={hitRate >= 60 ? 'text-green-600 dark:text-green-400' : 
                          hitRate <= 40 ? 'text-red-600 dark:text-red-400' : 
                          'text-blue-600 dark:text-blue-400'}>
            {hitRate.toFixed(0)}% Hit Rate
          </span>
        </div>
      </div>
      
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        Frequency of {statType.toLowerCase()} values across {games.length} games
      </div>
      
      <div className="h-48">
        <canvas ref={chartRef}></canvas>
      </div>
      
      <div className="flex justify-center mt-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center mr-4">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
          Over: {overCount} games
        </span>
        <span className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
          Under: {underCount} games
        </span>
      </div>
    </motion.div>
  );
};

export default DistributionGraph; 