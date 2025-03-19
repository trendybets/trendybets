// NBA team colors for visual accents
export const teamColors: Record<string, { primary: string, secondary: string }> = {
  // Eastern Conference - Atlantic Division
  "Boston Celtics": { primary: "#007A33", secondary: "#BA9653" },
  "Brooklyn Nets": { primary: "#000000", secondary: "#FFFFFF" },
  "New York Knicks": { primary: "#006BB6", secondary: "#F58426" },
  "Philadelphia 76ers": { primary: "#006BB6", secondary: "#ED174C" },
  "Toronto Raptors": { primary: "#CE1141", secondary: "#000000" },
  
  // Eastern Conference - Central Division
  "Chicago Bulls": { primary: "#CE1141", secondary: "#000000" },
  "Cleveland Cavaliers": { primary: "#860038", secondary: "#FDBB30" },
  "Detroit Pistons": { primary: "#C8102E", secondary: "#1D42BA" },
  "Indiana Pacers": { primary: "#002D62", secondary: "#FDBB30" },
  "Milwaukee Bucks": { primary: "#00471B", secondary: "#EEE1C6" },
  
  // Eastern Conference - Southeast Division
  "Atlanta Hawks": { primary: "#E03A3E", secondary: "#C1D32F" },
  "Charlotte Hornets": { primary: "#1D1160", secondary: "#00788C" },
  "Miami Heat": { primary: "#98002E", secondary: "#F9A01B" },
  "Orlando Magic": { primary: "#0077C0", secondary: "#C4CED4" },
  "Washington Wizards": { primary: "#002B5C", secondary: "#E31837" },
  
  // Western Conference - Northwest Division
  "Denver Nuggets": { primary: "#0E2240", secondary: "#FEC524" },
  "Minnesota Timberwolves": { primary: "#0C2340", secondary: "#236192" },
  "Oklahoma City Thunder": { primary: "#007AC1", secondary: "#EF3B24" },
  "Portland Trail Blazers": { primary: "#E03A3E", secondary: "#000000" },
  "Utah Jazz": { primary: "#002B5C", secondary: "#00471B" },
  
  // Western Conference - Pacific Division
  "Golden State Warriors": { primary: "#1D428A", secondary: "#FFC72C" },
  "Los Angeles Clippers": { primary: "#C8102E", secondary: "#1D428A" },
  "Los Angeles Lakers": { primary: "#552583", secondary: "#FDB927" },
  "Phoenix Suns": { primary: "#1D1160", secondary: "#E56020" },
  "Sacramento Kings": { primary: "#5A2D81", secondary: "#63727A" },
  
  // Western Conference - Southwest Division
  "Dallas Mavericks": { primary: "#00538C", secondary: "#002B5E" },
  "Houston Rockets": { primary: "#CE1141", secondary: "#000000" },
  "Memphis Grizzlies": { primary: "#5D76A9", secondary: "#12173F" },
  "New Orleans Pelicans": { primary: "#0C2340", secondary: "#C8102E" },
  "San Antonio Spurs": { primary: "#C4CED4", secondary: "#000000" },
  
  // Default color if team not found
  "Default": { primary: "#0072C6", secondary: "#8A8D8F" }
}; 