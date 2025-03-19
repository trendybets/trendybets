'use client'

import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { GameStats } from '../types';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Chart as ChartJS, registerables } from 'chart.js';

// Register Chart.js components and plugins
ChartJS.register(...registerables, annotationPlugin);

interface PerformanceHistoryGraphProps {
  games: GameStats[];
  statType: string;
  line: number;
  title?: string;
  className?: string;
}

const PerformanceHistoryGraph = ({ 
  games, 
  statType, 
  line, 
  title = 'Performance History',
  className = ''
}: PerformanceHistoryGraphProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // Get the correct stat value based on stat type
  const getStatValue = (game: GameStats, type: string) => {
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
  
  // Create labels from game data (using dates or opponent names)
  const labels = games.map(game => {
    if (game.opponent) return game.opponent;
    if (game.date) {
      // Format date - assuming ISO string format
      try {
        const date = new Date(game.date);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } catch (e) {
        return game.date;
      }
    }
    return 'Unknown';
  });
  
  // Generate data for the chart
  const chartData = {
    labels,
    datasets: [
      {
        label: statType,
        data: games.map(game => getStatValue(game, statType)),
        backgroundColor: games.map((game, index) => {
          const value = getStatValue(game, statType);
          const isOver = value > line;
          return index === hoveredIndex
            ? isOver ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)'
            : isOver ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
        }),
        borderColor: games.map(game => {
          const value = getStatValue(game, statType);
          return value > line ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)';
        }),
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };
  
  // Calculate overall hit rate
  const hitCount = games.filter(game => getStatValue(game, statType) > line).length;
  const hitRate = games.length > 0 ? (hitCount / games.length) * 100 : 0;
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 45
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          title: (tooltipItems: any) => {
            const idx = tooltipItems[0].dataIndex;
            return labels[idx] || `Game ${idx+1}`;
          },
          label: (tooltipItem: any) => {
            return `${statType}: ${tooltipItem.raw}`;
          },
          afterLabel: (tooltipItem: any) => {
            const idx = tooltipItem.dataIndex;
            const game = games[idx];
            if (!game) return '';
            
            const value = getStatValue(game, statType);
            const diff = value - line;
            return `Line: ${line} (${diff >= 0 ? '+' : ''}${diff.toFixed(1)})`;
          }
        }
      },
      annotation: {
        annotations: {
          line1: {
            type: 'line',
            yMin: line,
            yMax: line,
            borderColor: 'rgba(59, 130, 246, 0.8)',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              display: true,
              content: `Line: ${line}`,
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
    },
    onHover: (event: any, elements: any) => {
      if (elements && elements.length) {
        setHoveredIndex(elements[0].index);
      } else {
        setHoveredIndex(null);
      }
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm ${className}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
        <div className="flex items-center text-sm">
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
            <span className="text-gray-600 dark:text-gray-300">Over ({hitCount})</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
            <span className="text-gray-600 dark:text-gray-300">Under ({games.length - hitCount})</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-2 text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          {hitCount} of {games.length} games over the line
        </span>
        <span className={`font-medium ${
          hitRate >= 70 ? 'text-green-600 dark:text-green-400' : 
          hitRate <= 30 ? 'text-red-600 dark:text-red-400' : 
          'text-blue-600 dark:text-blue-400'
        }`}>
          {hitRate.toFixed(0)}% Hit Rate
        </span>
      </div>
      
      <div className="h-64">
        <Bar data={chartData} options={chartOptions as any} />
      </div>
    </motion.div>
  );
};

export default PerformanceHistoryGraph; 