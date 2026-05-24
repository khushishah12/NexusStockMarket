import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Routes anyone can visit without a session */
const PUBLIC_PATHS = ['/', '/login', '/signup'] as const;

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname === '/login' || pathname.startsWith('/login/')) return true;
  if (pathname === '/signup' || pathname.startsWith('/signup/')) return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;

  if (!url || !key) {
    if (!isPublicPath(pathname)) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = '/login';
      redirect.searchParams.set('error', 'config');
      return NextResponse.redirect(redirect);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(pathname)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/login';
    redirect.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirect);
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/dashboard';
    return NextResponse.redirect(redirect);
  }

  return supabaseResponse;
}
