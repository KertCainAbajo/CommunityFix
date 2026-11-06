import "server-only";

import { io } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { Activity, IssuePage, Meta, Stats, User } from "@/lib/types";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000/api";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY;

// The Sanctum token lives in this httpOnly cookie, so browser code never sees it.
export const TOKEN_COOKIE = "cf_token";
// Holds the random value that proves a Google sign-in was started on this site.
export const GOOGLE_STATE_COOKIE = "cf_google_state";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type ErrorBody = { message?: string; errors?: Record<string, string[]> };

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  // API data is always per-request, so anything built from it, like "2 days ago",
  // must wait for a real visitor instead of running during prerendering.
  await io();

  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  const visitor = requestHeaders.get("x-forwarded-for")?.split(",")[0].trim();
  const isJson = typeof init.body === "string";

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(isJson && { "Content-Type": "application/json" }),
      ...(token && { Authorization: `Bearer ${token}` }),
      // Rate limits need the visitor's address, not this server's.
      ...(INTERNAL_KEY && { "X-Internal-Key": INTERNAL_KEY }),
      ...(visitor && { "X-Client-Ip": visitor }),
    },
  });

  if (response.status === 204) return null as T;

  const body = await response.json().catch(() => null);

  // The cookie outlived its session. Sign-in pages handle their own 401s.
  if (response.status === 401 && token && !path.startsWith("/auth/")) redirect("/login");

  if (!response.ok) {
    const { message, errors } = (body ?? {}) as ErrorBody;
    const first = errors && Object.values(errors)[0]?.[0];
    throw new ApiError(response.status, first ?? message ?? "Something went wrong. Please try again.");
  }

  return body as T;
}

export const post = <T>(path: string, data?: object) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data ?? {}) });

export const getMeta = cache(() => api<Meta>("/meta"));

// Cached per request, so pages that show the figures in two places ask the API once.
export const getStats = cache(() => api<Stats>("/stats"));

export const getActivity = () => api<{ items: Activity[] }>("/activity");

export const getIssues = cache((query = "") => api<IssuePage>(`/issues${query && `?${query}`}`));

export const getUser = cache(async (): Promise<User | null> => {
  if (!(await cookies()).has(TOKEN_COOKIE)) return null;
  try {
    return (await api<{ user: User }>("/auth/me")).user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

export const isStaff = (user: User | null): user is User => user?.role === "staff" || user?.role === "admin";

/** The signed-in staff member, or a trip to the staff login. Residents are sent there too. */
export async function requireStaff(next: string): Promise<User> {
  const user = await getUser();
  if (!isStaff(user)) redirect(`/staff/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Any signed-in account, or a trip to the resident sign-in. */
export async function requireAccount(next: string): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Where someone lands after signing in, unless a safe `next` page was asked for. */
export function homeFor(user: User) {
  return isStaff(user) ? "/dashboard" : "/my-reports";
}

export async function startSession(token: string) {
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 14 * 86_400,
    path: "/",
  });
}

/** Turns Next.js search params into a query string for the API. */
export function toQuery(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) query.set(key, value);
  }
  return query;
}
