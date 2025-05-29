import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Middleware to handle user authentication and redirect accordingly.
 *
 * - Checks user session via Supabase auth.
 * - Redirects unauthenticated users trying to access protected routes to '/auth/login'.
 * - Redirects authenticated users away from '/auth/login' to the home page ('/').
 *
 * @param {NextRequest} request - The incoming Next.js request object.
 * @returns {Promise<NextResponse>} A NextResponse object, either continuing the request or redirecting.
 */

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data } = await supabase.auth.getSession()

  // If user is not signed in and the current path is not /auth/login,
  // redirect the user to /auth/login
  if (!data.session && !request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // If user is signed in and the current path is /auth/login,
  // redirect the user to /
  if (data.session && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

/**
 * Middleware config: applies middleware to all routes except:
 * - API routes (/api)
 * - Next.js static files (_next/static, _next/image)
 * - favicon.ico
 */

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
} 