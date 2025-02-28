import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Database } from "@/types/supabase"

// Add public routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/auth/callback']

// Add routes that require authentication
const protectedRoutes = ['/profile', '/dashboard', '/settings']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  try {
    // Debug: Log the Supabase URL from environment
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    
    const supabase = createMiddlewareClient<Database>({ req, res })
    
    // Refresh session if expired - required for Server Components
    await supabase.auth.getSession()
    
    // Check if the current route is protected (requires auth)
    const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route))
    
    if (isProtectedRoute) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      
      // If no session and trying to access protected route, redirect to home
      // We'll show the login popup on the home page
      if (!session) {
        const redirectUrl = new URL('/', req.url)
        return NextResponse.redirect(redirectUrl)
      }
    }
    
    return res
  } catch (e) {
    // Log any errors with more detail
    console.error('Middleware error details:', {
      error: e,
      url: req.url,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
    })
    
    // For non-auth routes, continue without blocking
    if (!req.nextUrl.pathname.startsWith('/api/auth')) {
      return res
    }
    
    // For auth routes that fail, redirect to home
    return NextResponse.redirect(new URL('/', req.url))
  }
}

// Add config to specify which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}

