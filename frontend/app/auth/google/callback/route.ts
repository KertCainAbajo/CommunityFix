import { timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { ApiError, GOOGLE_STATE_COOKIE, homeFor, post, startSession } from "@/lib/api";
import type { User } from "@/lib/types";

const sameValue = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Google sends the visitor back here with a one-time code, which the API swaps for a session. */
export async function GET(request: NextRequest) {
  const back = (reason: string) => NextResponse.redirect(new URL(`/login?google=${reason}`, request.url));
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const cookieStore = await cookies();
  const expected = cookieStore.get(GOOGLE_STATE_COOKIE)?.value ?? "";
  cookieStore.delete({ name: GOOGLE_STATE_COOKIE, path: "/auth/google" });

  // A missing or different state means this sign-in wasn't started here, so it's ignored.
  if (!code || !expected || !sameValue(state, expected)) return back("failed");

  try {
    const { user, token } = await post<{ user: User; token: string }>("/auth/google/callback", { code });
    await startSession(token);
    return NextResponse.redirect(new URL(homeFor(user), request.url));
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return back("staff");
    if (error instanceof ApiError && error.status === 404) return back("off");
    return back("failed");
  }
}
