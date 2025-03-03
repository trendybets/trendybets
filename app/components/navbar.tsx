'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Trendy Bets', href: '/' },
  { name: 'Betting', href: '/betting' },
  { name: 'Sync', href: '/sync' },
  { name: 'Trendy Games', href: '/trendy-games' },
  { name: 'Calculators', href: '/calculators' },
  { name: 'Trendy Props', href: '/trendy-props' },
  { name: 'Trendy Projections', href: '/trendy-projections' },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/[0.1] bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">Trendy Bets</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-white/90",
                  pathname === item.href
                    ? "text-white"
                    : "text-white/60"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search functionality can go here */}
          </div>
          <nav className="flex items-center">
            {/* Additional nav items can go here */}
          </nav>
        </div>
      </div>
    </nav>
  )
} 