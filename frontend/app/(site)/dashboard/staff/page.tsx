import type { Metadata } from "next";
import { Suspense } from "react";

import { NewStaffForm, StaffRow } from "@/components/forms";
import { EmptyState, PageSkeleton } from "@/components/issue-parts";
import { api, requireStaff } from "@/lib/api";
import type { User } from "@/lib/types";

export const metadata: Metadata = { title: "Staff accounts" };

async function StaffList() {
  const user = await requireStaff("/dashboard/staff");
  if (user.role !== "admin") return <EmptyState>Only admins can manage staff accounts.</EmptyState>;

  const { items } = await api<{ items: User[] }>("/staff");

  return (
    <>
      <NewStaffForm />
      <ul className="survey" aria-label="Staff accounts">
        {items.map((person) => <StaffRow key={person.id} person={person} isSelf={person.id === user.id} />)}
      </ul>
    </>
  );
}

export default function StaffPage() {
  return (
    <>
      <h1 className="text-5xl">Staff accounts</h1>
      <Suspense fallback={<PageSkeleton />}>
        <StaffList />
      </Suspense>
    </>
  );
}
