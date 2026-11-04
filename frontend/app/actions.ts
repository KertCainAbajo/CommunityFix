"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError, TOKEN_COOKIE, api, post } from "@/lib/api";
import type { FormState, NewStaffState, NoticeState, User } from "@/lib/types";

const SESSION_SECONDS = 14 * 86_400;
const TRACKING_CODE = /^CF-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

async function attempt(work: () => Promise<unknown>): Promise<FormState> {
  try {
    await work();
    return null;
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}

async function withRefresh(work: () => Promise<unknown>): Promise<FormState> {
  const failed = await attempt(work);
  if (!failed) refresh();
  return failed;
}

// Only same-site paths, so a crafted link can't send people elsewhere after login.
function safeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/dashboard";
}

// Residents

export async function createIssue(_: FormState, form: FormData): Promise<FormState> {
  const photos = form.getAll("photos[]").filter((photo) => photo instanceof File && photo.size > 0);
  form.delete("photos[]");
  photos.forEach((photo) => form.append("photos[]", photo));

  let code = "";
  const failed = await attempt(async () => {
    code = (await api<{ tracking_code: string }>("/issues", { method: "POST", body: form })).tracking_code;
  });
  if (failed) return failed;
  redirect(`/track/${code}?new=1`);
}

export async function findReport(_: FormState, form: FormData): Promise<FormState> {
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  if (!TRACKING_CODE.test(code)) return { error: "Tracking numbers look like CF-7K2M-9QXD." };
  redirect(`/track/${code}`);
}

export async function reopenReport(code: string, _: FormState, form: FormData) {
  return withRefresh(() => post(`/track/${code}/reopen`, { note: form.get("note") }));
}

// Staff sign-in

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const failed = await attempt(async () => {
    const { token } = await post<{ user: User; token: string }>("/auth/login", {
      email: form.get("email"),
      password: form.get("password"),
    });
    (await cookies()).set(TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_SECONDS,
      path: "/",
    });
  });
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
  redirect("/staff/login?reset=1");
}

// Staff work

export async function addStaffNote(id: number, _: FormState, form: FormData) {
  return withRefresh(() => post(`/issues/${id}/comments`, { note: form.get("note") }));
}

export async function changeStatus(id: number, _: FormState, form: FormData) {
  return withRefresh(() => post(`/issues/${id}/status`, { status: form.get("status"), note: form.get("note") }));
}

export async function assignIssue(id: number, _: FormState, form: FormData) {
  return withRefresh(() =>
    api(`/issues/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ priority: form.get("priority"), department: form.get("department") }),
    }),
  );
}

export async function addPhoto(id: number, _: FormState, form: FormData) {
  return withRefresh(() => api(`/issues/${id}/photos`, { method: "POST", body: form }));
}

// Staff accounts

export async function createStaff(_: NewStaffState, form: FormData): Promise<NewStaffState> {
  try {
    const { user, password } = await post<{ user: User; password: string }>("/staff", {
      name: form.get("name"),
      email: form.get("email"),
      role: form.get("role"),
    });
    refresh();
    return { email: user.email, password };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}

export async function updateStaff(id: number, changes: { role?: string; is_active?: boolean }) {
  return withRefresh(() => api(`/staff/${id}`, { method: "PATCH", body: JSON.stringify(changes) }));
}
