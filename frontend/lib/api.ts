import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import type { IssuePage, Meta, Stats, User } from "@/lib/types";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000/api";

// The Sanctum token lives in this httpOnly cookie, so browser code never sees it.
export const TOKEN_COOKIE = "cf_token";

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
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const isJson = typeof init.body === "string";

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(isJson && { "Content-Type": "application/json" }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (response.status === 204) return null as T;

  const body = await response.json().catch(() => null);

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

export const getStats = () => api<Stats>("/stats");

export const getIssues = (query = "") => api<IssuePage>(`/issues${query && `?${query}`}`);

export const getUser = cache(async (): Promise<User | null> => {
  if (!(await cookies()).has(TOKEN_COOKIE)) return null;
  try {
    return (await api<{ user: User }>("/auth/me")).user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

/** Turns Next.js search params into a query string for the API. */
export function toQuery(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) query.set(key, value);
  }
  return query;
}
