import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { serverEnv } from "@/lib/env"

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout

export async function GET(request: NextRequest) {
  try {
    // Get API token from request header
    const apiToken = request.headers.get('api-token');
    
    // For production, you should use a secure comparison method and store this in an environment variable
    if (apiToken !== serverEnv.CRON_API_TOKEN) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for dry run parameter
    const dryRun = request.nextUrl.searchParams.get('dry_run') === 'true';
    
    // Check for specific fixture
    const fixtureId = request.nextUrl.searchParams.get('fixture_id');

    // Construct the path to the Python script
    const workspaceRoot = process.cwd();
    const scriptPath = path.join(workspaceRoot, 'nba_betting', 'run_predictions.py');

    // Verify script exists
    if (!fs.existsSync(scriptPath)) {
      return new NextResponse(JSON.stringify({ error: 'Prediction script not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if we're running in Vercel production environment
    const isVercelProd = process.env.VERCEL_ENV === 'production';
    
    if (isVercelProd) {
      // In Vercel production, we can't run Python directly
      return new NextResponse(JSON.stringify({ 
        error: 'Python execution is not supported in this environment',
        message: 'This endpoint needs to be run on a server with Python installed. Please run this locally or set up a dedicated server for Python execution.',
        environment: process.env.VERCEL_ENV || 'unknown',
        dryRun,
        fixtureId
      }), {
        status: 501, // Not Implemented
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build command arguments
    const args = [scriptPath];
    
    if (dryRun) {
      args.push('--dry_run');
    }
    
    if (fixtureId) {
      args.push('--fixture_id', fixtureId);
    }

    // Set up environment variables for the Python process
    const env = {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      OPTIC_ODDS_API_KEY: process.env.OPTIC_ODDS_API_KEY,
      PYTHONUNBUFFERED: '1' // Ensure Python output is not buffered
    };

    console.log('Environment check for Python process:', {
      SUPABASE_URL_set: !!env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_KEY_set: !!env.SUPABASE_SERVICE_ROLE_KEY,
      OPTIC_API_KEY_set: !!env.OPTIC_ODDS_API_KEY
    });

    // Try different Python executable names (python3 is more likely to exist on Vercel)
    const pythonExecutables = ['python3', 'python'];
    let python;
    let executableUsed;
    
    for (const executable of pythonExecutables) {
      try {
        console.log(`Attempting to spawn Python process with executable: ${executable}`);
        python = spawn(executable, args, { env });
        executableUsed = executable;
        break;
      } catch (error) {
        console.error(`Failed to spawn with ${executable}:`, error);
        // Continue to the next executable if this one fails
      }
    }
    
    if (!python) {
      console.error('All Python executable attempts failed');
      return new NextResponse(JSON.stringify({ 
        error: 'Failed to start Python process. No Python executable found.',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Successfully spawned Python process using: ${executableUsed}`);
    
    let output = '';
    let errorOutput = '';

    // Capture stdout data
    python.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`Python stdout: ${data}`);
    });

    // Capture stderr data
    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`Python stderr: ${data}`);
    });

    // Return a promise that resolves when the process exits
    const exitCode = await new Promise<number>((resolve) => {
      python.on('close', (code: number | null) => {
        console.log(`Python process exited with code ${code}`);
        resolve(code ?? 1);
      });
    });

    if (exitCode !== 0) {
      return new NextResponse(JSON.stringify({ 
        error: 'Script execution failed',
        exitCode,
        errorOutput
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract prediction count from output (assuming it's printed)
    const predictionCountMatch = output.match(/Generated a total of (\d+) predictions/);
    const predictionCount = predictionCountMatch ? parseInt(predictionCountMatch[1], 10) : null;

    return new NextResponse(JSON.stringify({ 
      success: true, 
      message: 'Predictions generated successfully',
      predictions: predictionCount,
      dryRun,
      output: output.split('\n')
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error running predictions:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to run predictions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// CRON job handler for scheduled runs
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate CRON request
    const apiToken = request.headers.get('api-token');
    
    // For production, use a secure comparison method
    if (apiToken !== serverEnv.CRON_API_TOKEN) {
      console.error('Unauthorized access attempt to run-predictions');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Same logic as GET but designed for automated runs
    const workspaceRoot = process.cwd();
    const scriptPath = path.join(workspaceRoot, 'nba_betting', 'run_predictions.py');

    // Verify script exists
    if (!fs.existsSync(scriptPath)) {
      return new NextResponse(JSON.stringify({ error: 'Prediction script not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if we're running in Vercel production environment
    const isVercelProd = process.env.VERCEL_ENV === 'production';
    
    if (isVercelProd) {
      // In Vercel production, we can't run Python directly
      return new NextResponse(JSON.stringify({ 
        error: 'Python execution is not supported in this environment',
        message: 'This endpoint needs to be run on a server with Python installed. Please run this locally or set up a dedicated server for Python execution.',
        environment: process.env.VERCEL_ENV || 'unknown'
      }), {
        status: 501, // Not Implemented
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Set up environment variables for the Python process
    const env = {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      OPTIC_ODDS_API_KEY: process.env.OPTIC_ODDS_API_KEY,
      PYTHONUNBUFFERED: '1' // Ensure Python output is not buffered
    };

    console.log('Environment check for Python process:', {
      SUPABASE_URL_set: !!env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_KEY_set: !!env.SUPABASE_SERVICE_ROLE_KEY,
      OPTIC_API_KEY_set: !!env.OPTIC_ODDS_API_KEY
    });

    // Try different Python executable names (python3 is more likely to exist on Vercel)
    const pythonExecutables = ['python3', 'python'];
    let python;
    let executableUsed;
    
    for (const executable of pythonExecutables) {
      try {
        console.log(`Attempting to spawn Python process with executable: ${executable}`);
        python = spawn(executable, [scriptPath], { env });
        executableUsed = executable;
        break;
      } catch (error) {
        console.error(`Failed to spawn with ${executable}:`, error);
        // Continue to the next executable if this one fails
      }
    }
    
    if (!python) {
      console.error('All Python executable attempts failed');
      return new NextResponse(JSON.stringify({ 
        error: 'Failed to start Python process. No Python executable found.',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Successfully spawned Python process using: ${executableUsed}`);
    
    let output = '';
    let errorOutput = '';

    // Capture stdout data
    python.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`Python stdout: ${data}`);
    });

    // Capture stderr data
    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`Python stderr: ${data}`);
    });

    // Return a promise that resolves when the process exits
    const exitCode = await new Promise<number>((resolve) => {
      python.on('close', (code: number | null) => {
        console.log(`Python process exited with code ${code}`);
        resolve(code ?? 1);
      });
    });

    if (exitCode !== 0) {
      return new NextResponse(JSON.stringify({ 
        error: 'Script execution failed',
        exitCode,
        errorOutput
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract prediction count from output
    const predictionCountMatch = output.match(/Generated a total of (\d+) predictions/);
    const predictionCount = predictionCountMatch ? parseInt(predictionCountMatch[1], 10) : null;

    return new NextResponse(JSON.stringify({ 
      success: true, 
      message: 'Scheduled predictions generated successfully',
      predictions: predictionCount,
      output: output.split('\n')
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error running scheduled predictions:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to run scheduled predictions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 