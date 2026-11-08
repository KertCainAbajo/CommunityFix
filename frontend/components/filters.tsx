"use client";

import { Search } from "lucide-react";
import Form from "next/form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

type Options = Record<string, string>;

function Select({
  label,
  name,
  value,
  options,
  anyLabel,
}: {
  label: string;
  name: string;
  value?: string;
  options: Options;
  anyLabel?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`filter-${name}`}>{label}</Label>
      <NativeSelect id={`filter-${name}`} name={name} defaultValue={value ?? ""} className="w-full">
        {anyLabel && <NativeSelectOption value="">{anyLabel}</NativeSelectOption>}
        {Object.entries(options).map(([key, text]) => (
          <NativeSelectOption key={key} value={key}>{text}</NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

export function Filters({
  action,
  values,
  statuses,
  categories,
  sorts,
  keep = {},
}: {
  action: string;
  values: Record<string, string | undefined>;
  statuses?: Options;
  categories: Options;
  sorts: Options;
  /** Settings chosen elsewhere on the page, carried along with each search. */
  keep?: Record<string, string>;
}) {
  return (
    <Form
      key={JSON.stringify(values)}
      action={action}
      role="search"
      className={`grid grid-cols-2 gap-3 ${statuses ? "md:grid-cols-[2fr_1fr_1fr_1fr]" : "md:grid-cols-[2fr_1fr_1fr]"}`}
      onChange={(event) => {
        if (event.target instanceof HTMLSelectElement) event.currentTarget.requestSubmit();
      }}
    >
      {Object.entries(keep).map(([name, value]) => value && <input key={name} type="hidden" name={name} value={value} />)}
      <div className="col-span-2 grid gap-1.5 md:col-span-1">
        <Label htmlFor="filter-q">Search</Label>
        <Input id="filter-q" type="search" name="q" defaultValue={values.q} placeholder="Street, keyword…" />
      </div>
      {statuses && <Select label="Status" name="status" value={values.status} options={statuses} anyLabel="Any status" />}
      <Select label="Category" name="category" value={values.category} options={categories} anyLabel="Any category" />
      <Select label="Sort by" name="sort" value={values.sort} options={sorts} />
    </Form>
  );
}

/** The report search: words, sort order, and the filters chosen elsewhere on the page. */
export function ReportSearch({
  search,
  sort,
  sorts,
  keep,
}: {
  search: string;
  sort: string;
  sorts: Options;
  keep: Record<string, string>;
}) {
  return (
    <Form
      key={search + sort}
      action="/issues"
      role="search"
      className="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem_auto] md:items-end"
      onChange={(event) => {
        if (event.target instanceof HTMLSelectElement) event.currentTarget.requestSubmit();
      }}
    >
      {Object.entries(keep).map(([name, value]) => value && <input key={name} type="hidden" name={name} value={value} />)}
      <div className="grid gap-1.5">
        <Label htmlFor="report-search">Search reports</Label>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input id="report-search" type="search" name="q" maxLength={100} defaultValue={search} placeholder="Street, landmark or problem" className="h-12 rounded-xl pl-11" />
        </div>
      </div>
      <Select label="Sort by" name="sort" value={sort} options={sorts} />
      <Button type="submit" className="h-12 rounded-xl px-6">Search</Button>
    </Form>
  );
}
