'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

export default function RunPredictionsPage() {
  const [fixtureId, setFixtureId] = useState('');
  const [dryRun, setDryRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<number | null>(null);
  const [apiToken, setApiToken] = useState('');

  const runPredictions = async () => {
    setLoading(true);
    setStatus('idle');
    setMessage('');
    setOutput([]);
    setPredictions(null);

    try {
      // Build the API URL with query parameters
      let url = '/api/run-predictions';
      const params = new URLSearchParams();
      
      if (dryRun) {
        params.append('dry_run', 'true');
      }
      
      if (fixtureId) {
        params.append('fixture_id', fixtureId);
      }
      
      if (params.toString()) {
        url = `${url}?${params.toString()}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api-token': apiToken || '2b6tTNGbvjjmKOxcx1ElR/7Vr5olIlRXyhLWbt5dhk0=', // Use the CRON API token
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run predictions');
      }

      setStatus('success');
      setMessage(data.message || 'Predictions generated successfully');
      setPredictions(data.predictions);
      setOutput(data.output || []);
    } catch (error) {
      console.error('Error running predictions:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Run NBA Predictions</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Generate Predictions</CardTitle>
            <CardDescription>
              Run the Python prediction model to generate NBA player prop predictions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fixture-id">Fixture ID (Optional)</Label>
                <Input
                  id="fixture-id"
                  placeholder="e.g., nba:24AFD1BAE0DC"
                  value={fixtureId}
                  onChange={(e) => setFixtureId(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty to run predictions for all upcoming fixtures
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api-token">API Token (Optional)</Label>
                <Input
                  id="api-token"
                  type="password"
                  placeholder="Enter API token if needed"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty to use the default token
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="dry-run" 
                  checked={dryRun} 
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="dry-run">Dry Run (preview only, don't save to database)</Label>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={runPredictions} 
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Running Predictions...' : 'Run Predictions'}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              View the output of the prediction process
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'success' && (
              <div className="mb-4 p-4 rounded-md border-green-500 border bg-green-100 dark:bg-green-900/20">
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  <h5 className="font-medium">Success!</h5>
                </div>
                <div className="mt-1 text-sm">
                  {message}
                  {predictions !== null && (
                    <p className="font-medium mt-1">
                      Generated {predictions} predictions
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {status === 'error' && (
              <div className="mb-4 p-4 rounded-md border-red-500 border bg-red-100 dark:bg-red-900/20">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  <h5 className="font-medium">Error</h5>
                </div>
                <div className="mt-1 text-sm">{message}</div>
              </div>
            )}
            
            {output.length > 0 && (
              <div className="mt-4">
                <Label>Output Log</Label>
                <div className="mt-2 bg-muted p-4 rounded-md h-[300px] overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap">
                    {output.join('\n')}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>About the Prediction Model</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This page runs the NBA prop prediction model with the following features:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Uses weighted historical player performance data</li>
              <li>Accounts for home/away advantage factors</li>
              <li>Considers opponent strength in predictions</li>
              <li>Fetches current prop lines from Optic Odds API</li>
              <li>Calculates confidence levels and recommended bets</li>
            </ul>
            <p className="mt-4">
              Predictions are stored in the database and used to power the Trendy Props page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 