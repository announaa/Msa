"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/dictionaries";

type Request = {
  id: string;
  studentName: string;
  grade: string;
  school: string | null;
  requestedSubjects: string[];
  parentName: string;
  parentPhone: string;
  preferredTimes: string | null;
};

export function RegistrationRow({ request, dict }: { request: Request; dict: Dictionary }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<string | null>(null);

  async function decide(decision: "ACCEPTED" | "REJECTED") {
    setLoading(true);
    const res = await fetch(`/api/registrations/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (res.ok && data?.tempPassword) {
      setCredentials(data.tempPassword);
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">{request.studentName}</p>
          <p className="text-sm text-slate-500">
            {request.grade}
            {request.school ? ` · ${request.school}` : ""}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {request.parentName} · {request.parentPhone}
          </p>
          {request.requestedSubjects.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">{request.requestedSubjects.join(", ")}</p>
          )}
          {request.preferredTimes && <p className="text-xs text-slate-500">{request.preferredTimes}</p>}
        </div>
        <div className="flex gap-2">
          <button
            disabled={loading}
            onClick={() => decide("ACCEPTED")}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {dict.registrations.accept}
          </button>
          <button
            disabled={loading}
            onClick={() => decide("REJECTED")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {dict.registrations.reject}
          </button>
        </div>
      </div>
      {credentials && (
        <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          Parent account created. Temporary password: <span className="font-mono font-semibold">{credentials}</span>{" "}
          (also emailed if SMTP is configured).
        </p>
      )}
    </div>
  );
}
