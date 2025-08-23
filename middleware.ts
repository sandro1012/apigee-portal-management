// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Deixa rotas públicas de token passarem sem interferir (se existirem no seu projeto)
  if (pathname === '/api/auth/token' || pathname === '/api/public/token') {
    return NextResponse.next();
  }

  if (!pathname.startsWith('/api/')) return NextResponse.next();

  const headers = new Headers(req.headers);

  // Normaliza token: cookie gcp_token OU x-apigee-token OU Authorization
  const cookieToken = req.cookies.get('gcp_token')?.value || '';
  const headerToken = headers.get('x-apigee-token') || headers.get('authorization') || '';
  let token = headerToken || cookieToken || '';
  if (token && !/^Bearer\s+/i.test(token)) token = `Bearer ${token}`;

  if (token) {
    headers.set('x-apigee-token', token);
    headers.set('authorization', token);
  }

  // Propaga org do cookie apigee_org se o header não estiver setado
  const orgCookie = req.cookies.get('apigee_org')?.value;
  if (orgCookie && !headers.get('x-apigee-org')) {
    headers.set('x-apigee-org', orgCookie);
  }

  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ['/api/:path*'] };
