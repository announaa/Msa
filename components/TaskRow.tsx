"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/dictionaries";

type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "NEEDS_REVIEW" | "COULD_NOT_COMPLETE";
type Understanding = "EXCELLENT" | "GOOD" | "NEEDS_SUPPORT";

type TaskWithRelations = {
  id: string;
  description: string;
  status: TaskStatus;
  understanding: Understanding | null;
  note: string | null;
  student: { fullName: string };
  subject: { name: string };
  teacher: { user: { fullName: string } };
};

export function TaskRow({
  task,
  dict,
  canEdit,
}: {
  task: TaskWithRelations;
  dict: Dictionary;
  canEdit: boolean;
}) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [understanding, setUnderstanding] = useState<Understanding | "">(task.understanding ?? "");
  const [note, setNote] = useState(task.note ?? "");
  const [saving, setSaving] = useState(false);

  async function save(next: Partial<{ status: TaskStatus; understanding: Understanding | ""; note: string }>) {
    setSaving(true);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: next.status ?? status,
        understanding: (next.understanding ?? understanding) || null,
        note: next.note ?? note,
      }),
    });
    setSaving(false);
  }

  return (
    <li className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">
          {task.student.fullName} — {task.subject.name}
        </p>
        <p className="text-sm text-slate-500">{task.description}</p>
        <p className="text-xs text-slate-400">{task.teacher.user.fullName}</p>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            disabled={saving}
            onChange={(e) => {
              const value = e.target.value as TaskStatus;
              setStatus(value);
              save({ status: value });
            }}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
          >
            {Object.entries(dict.tasks.status).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {status === "COMPLETED" && (
            <select
              value={understanding}
              disabled={saving}
              onChange={(e) => {
                const value = e.target.value as Understanding | "";
                setUnderstanding(value);
                save({ understanding: value });
              }}
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
            >
              <option value="">—</option>
              {Object.entries(dict.tasks.understanding).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          )}

          <input
            value={note}
            disabled={saving}
            placeholder={dict.tasks.note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => save({ note })}
            className="w-48 rounded-lg border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
      ) : (
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
          {dict.tasks.status[status]}
        </span>
      )}
    </li>
  );
}
