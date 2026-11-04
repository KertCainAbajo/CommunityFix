export type Status = "reported" | "acknowledged" | "in_progress" | "resolved" | "rejected";
export type Priority = "low" | "normal" | "high" | "urgent";

export type User = {
  id: number;
  name: string;
  email: string;
  role: "resident" | "staff";
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

export type Issue = {
  id: number;
  ref: string;
  title: string;
  description: string;
  category: string;
  address: string;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  status: Status;
  priority: Priority;
  department: string | null;
  support_count: number;
  supported: boolean;
  is_mine: boolean;
  reporter_name?: string;
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
};

export type Stats = {
  total: number;
  open: number;
  by_status: Record<Status, number>;
  open_by_category: { category: string; n: number }[];
  avg_resolution_days: number | null;
};

export type FormState = { error: string } | null;

export type MapPoint = Pick<Issue, "id" | "title" | "status"> & { lat: number; lng: number };

export const OPEN_STATUSES: Status[] = ["reported", "acknowledged", "in_progress"];
