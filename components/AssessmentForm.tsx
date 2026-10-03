"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/dictionaries";

export function AssessmentForm({
  studentId,
  subjects,
  dict,
}: {
  studentId: string;
  subjects: { id: string; name: string }[];
  dict: Dictionary;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    await fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        subjectId: data.get("subjectId"),
        topic: data.get("topic"),
        examLabel: data.get("examLabel"),
        scorePercent: Number(data.get("scorePercent")),
      }),
    });
    setLoading(false);
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-4 shadow-sm">
      <select name="subjectId" required defaultValue="" className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
        <option value="" disabled>
          {dict.academics.subject}
        </option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input
        name="examLabel"
        required
        placeholder={dict.academics.examLabel}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="topic"
        required
        placeholder={dict.academics.topic}
        className="min-w-[12rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="scorePercent"
        type="number"
        min="0"
        max="100"
        required
        placeholder={dict.academics.score}
        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {dict.academics.recordAssessment}
      </button>
    </form>
  );
}
