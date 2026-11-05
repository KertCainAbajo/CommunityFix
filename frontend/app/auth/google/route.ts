import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { GOOGLE_STATE_COOKIE, post } from "@/lib/api";

/** Starts "Continue with Google": remembers a random state value, then sends the visitor to Google. */
export async function GET(request: NextRequest) {
  const state = randomBytes(20).toString("hex");

  try {
    const { url } = await post<{ url: string }>("/auth/google/url", { state });
    (await cookies()).set(GOOGLE_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/auth/google",
    });
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(new URL("/login?google=off", request.url));
  }
}
