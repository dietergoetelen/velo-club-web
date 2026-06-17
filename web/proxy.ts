import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// /join/<token> must be reachable logged-out — it's the invite landing page
// that routes people into auth and back. Without it here, the middleware
// bounces invitees to /login and the token is lost.
const PUBLIC = ['/login', '/register', '/join', '/static'];

function isValidToken(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const raw          = request.cookies.get('pb_auth')?.value;
  const token        = raw && isValidToken(raw) ? raw : null;
  const isPublic     = PUBLIC.some(p => pathname.startsWith(p));

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
