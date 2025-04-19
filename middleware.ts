import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
} 