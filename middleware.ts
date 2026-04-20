import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const MAINTENANCE_MODE = false

export function middleware(request: NextRequest) {
  if (!MAINTENANCE_MODE) return NextResponse.next()

  // Dejar pasar assets estáticos para que la página de mantenimiento cargue bien
  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  return NextResponse.rewrite(new URL('/maintenance', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}