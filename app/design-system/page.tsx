import React from 'react';
import { Button } from '@/app/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';

export default function DesignSystemPage() {
  return (
    <div className="container mx-auto py-8 space-y-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">TrendyBets Design System</h1>
        <p className="text-primary-black-600 max-w-2xl mx-auto">
          A comprehensive guide to our visual language, components, and patterns.
        </p>
      </div>

      {/* Color Palette Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-primary-black-200 pb-2">Color Palette</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Primary Blue</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                <div key={`blue-${shade}`} className="space-y-2">
                  <div 
                    className={`h-20 rounded-md bg-primary-blue-${shade} border border-primary-black-200`}
                  ></div>
                  <div className="flex justify-between text-sm">
                    <span>{shade}</span>
                    <span className="font-mono text-primary-black-500">{`blue-${shade}`}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Primary Green</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                <div key={`green-${shade}`} className="space-y-2">
                  <div 
                    className={`h-20 rounded-md bg-primary-green-${shade} border border-primary-black-200`}
                  ></div>
                  <div className="flex justify-between text-sm">
                    <span>{shade}</span>
                    <span className="font-mono text-primary-black-500">{`green-${shade}`}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Primary Black</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                <div key={`black-${shade}`} className="space-y-2">
                  <div 
                    className={`h-20 rounded-md bg-primary-black-${shade} border border-primary-black-200`}
                  ></div>
                  <div className="flex justify-between text-sm">
                    <span>{shade}</span>
                    <span className="font-mono text-primary-black-500">{`black-${shade}`}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Semantic Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'success', label: 'Success' },
                { name: 'warning', label: 'Warning' },
                { name: 'error', label: 'Error' },
                { name: 'info', label: 'Info' },
              ].map((color) => (
                <div key={color.name} className="space-y-2">
                  <div 
                    className={`h-20 rounded-md bg-semantic-${color.name} border border-primary-black-200`}
                  ></div>
                  <div className="flex justify-between text-sm">
                    <span>{color.label}</span>
                    <span className="font-mono text-primary-black-500">{`semantic-${color.name}`}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Typography Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-primary-black-200 pb-2">Typography</h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Headings</h3>
            <div className="space-y-4 bg-white p-6 rounded-lg border border-primary-black-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <h1 className="text-5xl">Heading 1</h1>
                <span className="text-primary-black-500 text-sm font-mono">text-5xl</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <h2 className="text-4xl">Heading 2</h2>
                <span className="text-primary-black-500 text-sm font-mono">text-4xl</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <h3 className="text-3xl">Heading 3</h3>
                <span className="text-primary-black-500 text-sm font-mono">text-3xl</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <h4 className="text-2xl">Heading 4</h4>
                <span className="text-primary-black-500 text-sm font-mono">text-2xl</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <h5 className="text-xl">Heading 5</h5>
                <span className="text-primary-black-500 text-sm font-mono">text-xl</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <h6 className="text-lg">Heading 6</h6>
                <span className="text-primary-black-500 text-sm font-mono">text-lg</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Text Styles</h3>
            <div className="space-y-4 bg-white p-6 rounded-lg border border-primary-black-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <p className="text-base font-normal">Base text (Regular)</p>
                <span className="text-primary-black-500 text-sm font-mono">text-base font-normal</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <p className="text-base font-medium">Medium text</p>
                <span className="text-primary-black-500 text-sm font-mono">text-base font-medium</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <p className="text-base font-semibold">Semibold text</p>
                <span className="text-primary-black-500 text-sm font-mono">text-base font-semibold</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <p className="text-base font-bold">Bold text</p>
                <span className="text-primary-black-500 text-sm font-mono">text-base font-bold</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <p className="text-sm">Small text</p>
                <span className="text-primary-black-500 text-sm font-mono">text-sm</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <p className="text-xs">Extra small text</p>
                <span className="text-primary-black-500 text-sm font-mono">text-xs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Components Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-primary-black-200 pb-2">Components</h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Buttons</h3>
            <div className="bg-white p-6 rounded-lg border border-primary-black-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Button variant="default">Default Button</Button>
                  <p className="text-sm text-primary-black-500">Default</p>
                </div>
                <div className="space-y-2">
                  <Button variant="secondary">Secondary Button</Button>
                  <p className="text-sm text-primary-black-500">Secondary</p>
                </div>
                <div className="space-y-2">
                  <Button variant="outline">Outline Button</Button>
                  <p className="text-sm text-primary-black-500">Outline</p>
                </div>
                <div className="space-y-2">
                  <Button variant="ghost">Ghost Button</Button>
                  <p className="text-sm text-primary-black-500">Ghost</p>
                </div>
                <div className="space-y-2">
                  <Button variant="link">Link Button</Button>
                  <p className="text-sm text-primary-black-500">Link</p>
                </div>
                <div className="space-y-2">
                  <Button variant="destructive">Destructive Button</Button>
                  <p className="text-sm text-primary-black-500">Destructive</p>
                </div>
                <div className="space-y-2">
                  <Button variant="success">Success Button</Button>
                  <p className="text-sm text-primary-black-500">Success</p>
                </div>
                <div className="space-y-2">
                  <Button disabled>Disabled Button</Button>
                  <p className="text-sm text-primary-black-500">Disabled</p>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Button size="sm">Small Button</Button>
                  <p className="text-sm text-primary-black-500">Small</p>
                </div>
                <div className="space-y-2">
                  <Button size="default">Default Size</Button>
                  <p className="text-sm text-primary-black-500">Default</p>
                </div>
                <div className="space-y-2">
                  <Button size="lg">Large Button</Button>
                  <p className="text-sm text-primary-black-500">Large</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Cards</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Default Card</CardTitle>
                  <CardDescription>This is a default card component</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Cards are used to group related content and actions.</p>
                </CardContent>
                <CardFooter>
                  <Button>Action</Button>
                </CardFooter>
              </Card>
              
              <Card variant="outline">
                <CardHeader>
                  <CardTitle>Outline Card</CardTitle>
                  <CardDescription>This is an outline card component</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Cards are used to group related content and actions.</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline">Action</Button>
                </CardFooter>
              </Card>
              
              <Card variant="filled">
                <CardHeader>
                  <CardTitle>Filled Card</CardTitle>
                  <CardDescription>This is a filled card component</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Cards are used to group related content and actions.</p>
                </CardContent>
                <CardFooter>
                  <Button variant="secondary">Action</Button>
                </CardFooter>
              </Card>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Badges</h3>
            <div className="bg-white p-6 rounded-lg border border-primary-black-200">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2 text-center">
                  <Badge variant="default">Default</Badge>
                  <p className="text-xs text-primary-black-500">Default</p>
                </div>
                <div className="space-y-2 text-center">
                  <Badge variant="secondary">Secondary</Badge>
                  <p className="text-xs text-primary-black-500">Secondary</p>
                </div>
                <div className="space-y-2 text-center">
                  <Badge variant="outline">Outline</Badge>
                  <p className="text-xs text-primary-black-500">Outline</p>
                </div>
                <div className="space-y-2 text-center">
                  <Badge variant="success">Success</Badge>
                  <p className="text-xs text-primary-black-500">Success</p>
                </div>
                <div className="space-y-2 text-center">
                  <Badge variant="warning">Warning</Badge>
                  <p className="text-xs text-primary-black-500">Warning</p>
                </div>
                <div className="space-y-2 text-center">
                  <Badge variant="error">Error</Badge>
                  <p className="text-xs text-primary-black-500">Error</p>
                </div>
                <div className="space-y-2 text-center">
                  <Badge variant="info">Info</Badge>
                  <p className="text-xs text-primary-black-500">Info</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sports Betting UI Elements */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-primary-black-200 pb-2">Sports Betting UI Elements</h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Odds Display</h3>
            <div className="bg-white p-6 rounded-lg border border-primary-black-200">
              <div className="flex flex-wrap gap-4">
                <div className="odds-badge odds-badge-positive">+150</div>
                <div className="odds-badge odds-badge-negative">-120</div>
                <div className="odds-badge odds-badge-neutral">EVEN</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Stat Badges</h3>
            <div className="bg-white p-6 rounded-lg border border-primary-black-200">
              <div className="flex flex-wrap gap-4">
                <div className="stat-badge stat-badge-primary">PPG: 28.5</div>
                <div className="stat-badge stat-badge-secondary">APG: 8.2</div>
                <div className="stat-badge stat-badge-success">FG%: 52.3</div>
                <div className="stat-badge stat-badge-danger">TO: 3.1</div>
                <div className="stat-badge stat-badge-warning">MINS: 36.4</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Team Pills</h3>
            <div className="bg-white p-6 rounded-lg border border-primary-black-200">
              <div className="flex flex-wrap gap-4">
                <div className="team-pill">Lakers</div>
                <div className="team-pill">Celtics</div>
                <div className="team-pill">Warriors</div>
                <div className="team-pill">Heat</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Trend Indicators</h3>
            <div className="bg-white p-6 rounded-lg border border-primary-black-200">
              <div className="flex flex-wrap gap-8">
                <div className="flex items-center gap-2">
                  <svg className="trend-up w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="trend-up">Trending Up</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="trend-down w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="trend-down">Trending Down</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="trend-neutral w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                  </svg>
                  <span className="trend-neutral">Neutral Trend</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Game Status Indicators</h3>
            <div className="bg-white p-6 rounded-lg border border-primary-black-200">
              <div className="flex flex-wrap gap-8">
                <div className="live-indicator">LIVE</div>
                <div className="game-time">7:30 PM ET</div>
                <div className="game-time">Q4 2:15</div>
                <div className="game-time">FINAL</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 