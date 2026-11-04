"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError, TOKEN_COOKIE, api, post } from "@/lib/api";
import type { FormState, Issue, NoticeState, User } from "@/lib/types";

const SESSION_SECONDS = 14 * 86_400;

async function attempt(work: () => Promise<unknown>): Promise<FormState> {
  try {
    await work();
    return null;
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}

// Only same-site paths, so a crafted link can't send people elsewhere after login.
function safeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/";
}

async function startSession(path: string, data: object) {
  const { token } = await post<{ user: User; token: string }>(path, data);
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_SECONDS,
    path: "/",
  });
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const failed = await attempt(() =>
    startSession("/auth/login", { email: form.get("email"), password: form.get("password") }),
  );
  if (failed) return failed;
  redirect(safeNext(form.get("next")));
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const failed = await attempt(() =>
    startSession("/auth/register", {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    }),
  );
  if (failed) return failed;
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await attempt(() => post("/auth/logout"));
  (await cookies()).delete(TOKEN_COOKIE);
  redirect("/");
}

export async function forgotPassword(_: NoticeState, form: FormData): Promise<NoticeState> {
  try {
    const { message } = await post<{ message: string }>("/auth/forgot-password", { email: form.get("email") });
    return { notice: message };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const failed = await attempt(() =>
    post("/auth/reset-password", {
      token: form.get("token"),
      email: form.get("email"),
      password: form.get("password"),
    }),
  );
  if (failed) return failed;
  redirect("/login?reset=1");
}

export async function createIssue(_: FormState, form: FormData): Promise<FormState> {
  const photo = form.get("photo");
  if (photo instanceof File && photo.size === 0) form.delete("photo");

  let id = 0;
  const failed = await attempt(async () => {
    id = (await api<Issue>("/issues", { method: "POST", body: form })).id;
  });
  if (failed) return failed;
  redirect(`/issues/${id}`);
}

async function issueAction(work: () => Promise<unknown>): Promise<FormState> {
  const failed = await attempt(work);
  if (!failed) refresh();
  return failed;
}

export async function addComment(id: number, _: FormState, form: FormData) {
  return issueAction(() => post(`/issues/${id}/comments`, { note: form.get("note") }));
}

export async function reopenIssue(id: number, _: FormState, form: FormData) {
  return issueAction(() => post(`/issues/${id}/reopen`, { note: form.get("note") }));
}

export async function changeStatus(id: number, _: FormState, form: FormData) {
  return issueAction(() =>
    post(`/issues/${id}/status`, { status: form.get("status"), note: form.get("note") }),
  );
}

export async function assignIssue(id: number, _: FormState, form: FormData) {
  return issueAction(() =>
    api(`/issues/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ priority: form.get("priority"), department: form.get("department") }),
    }),
  );
}

export async function toggleSupport(id: number): Promise<FormState> {
  return issueAction(() => post(`/issues/${id}/support`));
}
