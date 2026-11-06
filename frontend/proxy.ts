import { NextResponse, type NextRequest } from "next/server";

// Kept here as well as in lib/api.ts, which is server-only and can't load in this file.
const TOKEN_COOKIE = "cf_token";

// The only pages someone can see before signing in.
const OPEN_PAGES = /^\/(login|register|auth\/google|staff\/(login|forgot-password|reset-password))(\/|$)/;

/** Sends anyone without a session to the sign-in page, then back to where they were heading. */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (OPEN_PAGES.test(pathname) || request.cookies.has(TOKEN_COOKIE)) return NextResponse.next();

  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);

  return NextResponse.redirect(login);
}

export const config = {
  // Skips Next.js's own files and anything with a file extension, like the logo.
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
