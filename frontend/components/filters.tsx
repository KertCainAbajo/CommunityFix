"use client";

import Form from "next/form";

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
}: {
  action: string;
  values: Record<string, string | undefined>;
  statuses: Options;
  categories: Options;
  sorts: Options;
}) {
  return (
    <Form
      key={JSON.stringify(values)}
      action={action}
      role="search"
      className="grid grid-cols-2 gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]"
      onChange={(event) => {
        if (event.target instanceof HTMLSelectElement) event.currentTarget.requestSubmit();
      }}
    >
      <div className="col-span-2 grid gap-1.5 md:col-span-1">
        <Label htmlFor="filter-q">Search</Label>
        <Input id="filter-q" type="search" name="q" defaultValue={values.q} placeholder="Street, keyword…" />
      </div>
      <Select label="Status" name="status" value={values.status} options={statuses} anyLabel="Any status" />
      <Select label="Category" name="category" value={values.category} options={categories} anyLabel="Any category" />
      <Select label="Sort by" name="sort" value={values.sort} options={sorts} />
    </Form>
  );
}
