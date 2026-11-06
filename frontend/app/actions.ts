"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError, TOKEN_COOKIE, api, homeFor, post, startSession } from "@/lib/api";
import type { FormState, NewStaffState, NoticeState, User } from "@/lib/types";

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
function safeNext(value: FormDataEntryValue | null, fallback: string) {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
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

// Signing in: staff and residents

export async function login(_: FormState, form: FormData): Promise<FormState> {
  let user: User | undefined;
  const failed = await attempt(async () => {
    const session = await post<{ user: User; token: string }>("/auth/login", {
      login: form.get("login"),
      password: form.get("password"),
      portal: form.get("portal"),
    });
    await startSession(session.token);
    user = session.user;
  });
  if (failed || !user) return failed;
  redirect(safeNext(form.get("next"), homeFor(user)));
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const failed = await attempt(async () => {
    const session = await post<{ user: User; token: string }>("/auth/register", {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      password: form.get("password"),
    });
    await startSession(session.token);
  });
  if (failed) return failed;
  redirect(safeNext(form.get("next"), "/my-reports"));
}

export async function logout() {
  await attempt(() => post("/auth/logout"));
  (await cookies()).delete(TOKEN_COOKIE);
  redirect("/login");
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
    // Staff accounts always have an email: admins must give one.
    return { email: user.email ?? "", password };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}

export async function updateStaff(id: number, changes: { role?: string; is_active?: boolean }) {
  return withRefresh(() => api(`/staff/${id}`, { method: "PATCH", body: JSON.stringify(changes) }));
}
