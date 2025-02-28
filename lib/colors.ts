export async function getTeamColors(logoUrl: string): Promise<{ primary: string; secondary: string }> {
  try {
    // Create a canvas element
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')

    // Load the image
    const img = new Image()
    img.crossOrigin = 'anonymous' // Enable CORS
    
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = logoUrl
    })

    // Draw image to canvas
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    
    // Count color frequencies
    const colorCounts: { [key: string]: number } = {}
    
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i]
      const g = imageData[i + 1]
      const b = imageData[i + 2]
      const a = imageData[i + 3]
      
      // Skip transparent pixels
      if (a < 128) continue
      
      // Convert to hex
      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
      colorCounts[hex] = (colorCounts[hex] || 0) + 1
    }

    // Sort colors by frequency
    const sortedColors = Object.entries(colorCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([color]) => color)

    return {
      primary: sortedColors[0] || '#c41e3a',    // Default red if no color found
      secondary: sortedColors[1] || '#2d5a27'    // Default green if no color found
    }
  } catch (error) {
    console.error('Error analyzing team colors:', error)
    return {
      primary: '#c41e3a',    // Default red
      secondary: '#2d5a27'    // Default green
    }
  }
} 