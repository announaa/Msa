"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/dictionaries";

export function AssignTaskForm({
  students,
  subjects,
  teachers,
  dict,
}: {
  students: { id: string; fullName: string }[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; fullName: string }[];
  dict: Dictionary;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: data.get("studentId"),
        subjectId: data.get("subjectId"),
        teacherId: data.get("teacherId"),
        description: data.get("description"),
      }),
    });
    setLoading(false);
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-4 shadow-sm">
      <Select name="studentId" options={students.map((s) => [s.id, s.fullName])} />
      <Select name="subjectId" options={subjects.map((s) => [s.id, s.name])} />
      <Select name="teacherId" options={teachers.map((t) => [t.id, t.fullName])} />
      <input
        name="description"
        required
        placeholder="e.g. Mathematics — Homework p.25"
        className="min-w-[14rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {dict.common.submit}
      </button>
    </form>
  );
}

function Select({ name, options }: { name: string; options: [string, string][] }) {
  return (
    <select name={name} required defaultValue="" className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
      <option value="" disabled>
        —
      </option>
      {options.map(([id, label]) => (
        <option key={id} value={id}>
          {label}
        </option>
      ))}
    </select>
  );
}
