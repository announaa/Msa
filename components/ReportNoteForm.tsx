"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/dictionaries";

type Note = { strengths: string; areasToImprove: string; recommendations: string };

export function ReportNoteForm({
  studentId,
  months,
  notes,
  dict,
}: {
  studentId: string;
  months: { value: string; label: string }[];
  notes: Record<string, Note>;
  dict: Dictionary;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(months[0].value);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const current = notes[month] ?? { strengths: "", areasToImprove: "", recommendations: "" };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    const data = new FormData(e.currentTarget);
    const res = await fetch("/api/report-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        month,
        strengths: data.get("strengths"),
        areasToImprove: data.get("areasToImprove"),
        recommendations: data.get("recommendations"),
      }),
    });
    setLoading(false);
    setSaved(res.ok);
    if (res.ok) router.refresh();
  }

  const field = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

  return (
    // `key` remounts the uncontrolled fields with the right defaults when the month changes.
    <form key={month} onSubmit={onSubmit} className="space-y-2 rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold">{dict.academics.reportNoteTitle}</p>
      <select value={month} onChange={(e) => setMonth(e.target.value)} className={field}>
        {months.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <textarea name="strengths" rows={2} defaultValue={current.strengths} placeholder={dict.academics.strengths} className={field} />
      <textarea name="areasToImprove" rows={2} defaultValue={current.areasToImprove} placeholder={dict.academics.areasToImprove} className={field} />
      <textarea name="recommendations" rows={2} defaultValue={current.recommendations} placeholder={dict.academics.recommendations} className={field} />
      <div className="flex items-center gap-3">
        <button disabled={loading} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {dict.academics.saveNote}
        </button>
        {saved && <span className="text-sm text-green-600">{dict.academics.noteSaved}</span>}
      </div>
    </form>
  );
}
