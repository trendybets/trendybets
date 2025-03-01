import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { serverEnv } from "@/lib/env"

export const dynamic = 'force-dynamic';

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

    // Build command arguments
    const args = [scriptPath];
    
    if (dryRun) {
      args.push('--dry_run');
    }
    
    if (fixtureId) {
      args.push('--fixture_id', fixtureId);
    }

    // Execute the Python script
    const python = spawn('python', args);
    
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
      python.on('close', (code) => {
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

    // Execute the Python script
    const python = spawn('python', [scriptPath]);
    
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
      python.on('close', (code) => {
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