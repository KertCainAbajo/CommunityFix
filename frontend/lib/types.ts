export type Status = "reported" | "acknowledged" | "in_progress" | "resolved" | "rejected";
export type Priority = "low" | "normal" | "high" | "urgent";

export type User = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: "staff" | "admin" | "resident";
  is_active: boolean;
};

export type TimelineEntry = {
  id: number;
  author: string | null;
  author_role: string;
  from_status: Status | null;
  to_status: Status | null;
  note: string | null;
  created_at: string;
};

export type Photo = {
  id: number;
  kind: "evidence" | "before" | "after";
  label: string;
  url: string;
};

export type Issue = {
  id: number;
  ref: string;
  title: string;
  description: string;
  category: string;
  address: string;
  lat: number | null;
  lng: number | null;
  photos: Photo[];
  photo_url: string | null;
  status: Status;
  priority: Priority;
  department: string | null;
  // Only staff receive these two.
  tracking_code?: string;
  contact?: { name: string | null; email: string | null; phone: string | null };
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  timeline?: TimelineEntry[];
};

export type IssuePage = {
  items: Issue[];
  total: number;
  page: number;
  pages: number;
};

export type Meta = {
  categories: Record<string, string>;
  statuses: Record<Status, string>;
  priorities: Record<Priority, string>;
  transitions: Record<Status, Status[]>;
  map_center: { lat: number; lng: number };
  google_login: boolean;
};

export type Stats = {
  total: number;
  open: number;
  by_status: Record<Status, number>;
  open_by_category: { category: string; n: number }[];
  avg_resolution_days: number | null;
  overdue: number;
  trends: { total: number[]; open: number[]; resolved: number[]; overdue: number[] };
};

export type Activity = {
  id: number;
  issue_id: number;
  ref: string;
  title: string;
  from_status: Status | null;
  to_status: Status | null;
  author: string | null;
  created_at: string;
};

export type Breakdown = { total: number; open: number; resolved: number; avg_days: number | null };

export type Analytics = Stats & {
  by_category: (Breakdown & { category: string })[];
  by_team: (Breakdown & { team: string })[];
  by_month: { month: string; reported: number; resolved: number }[];
};

export type FormState = { error: string } | null;
export type NoticeState = { error: string } | { notice: string } | null;
export type NewStaffState = { error: string } | { email: string; password: string } | null;

export type MapPoint = Pick<Issue, "id" | "title" | "status"> & { lat: number; lng: number };
