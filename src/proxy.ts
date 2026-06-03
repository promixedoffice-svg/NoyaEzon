import { NextResponse, type NextRequest } from 'next/server'
import { getIronSession } from 'iron-session'
import type { SessionData } from '@/lib/auth'

const SESSION_OPTIONS = {
  cookieName: 'noya_session',
  password: process.env.SESSION_SECRET ?? 'change-this-secret-must-be-32-chars-min',
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next({ request })

  const session = await getIronSession<SessionData>(request, response, SESSION_OPTIONS)

  if (pathname.startsWith('/admin') && !session.isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname === '/login' && session.isLoggedIn) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
}
