"use client";

import { useState, type FormEvent } from "react";
import { getDictionary, type Locale } from "@/lib/dictionaries";

export default function RegisterPage({ params }: { params: { locale: Locale } }) {
  const dict = getDictionary(params.locale);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      studentName: String(form.get("studentName") || ""),
      dateOfBirth: String(form.get("dateOfBirth") || ""),
      school: String(form.get("school") || ""),
      grade: String(form.get("grade") || ""),
      requestedSubjects: String(form.get("subjects") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      parentName: String(form.get("parentName") || ""),
      parentPhone: String(form.get("parentPhone") || ""),
      parentEmail: String(form.get("parentEmail") || ""),
      preferredTimes: String(form.get("preferredTimes") || ""),
    };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (res.ok) {
      setSubmitted(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="text-lg font-medium text-brand-700">{dict.register.success}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-6 text-2xl font-bold">{dict.register.title}</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={dict.register.studentName} name="studentName" required />
        <Field label={dict.register.dateOfBirth} name="dateOfBirth" type="date" />
        <Field label={dict.register.school} name="school" />
        <Field label={dict.register.grade} name="grade" required />
        <Field label={dict.register.subjects} name="subjects" />
        <Field label={dict.register.parentName} name="parentName" required />
        <Field label={dict.register.parentPhone} name="parentPhone" required />
        <Field label={dict.register.parentEmail} name="parentEmail" type="email" />
        <Field label={dict.register.preferredTimes} name="preferredTimes" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {dict.common.submit}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
      />
    </label>
  );
}
