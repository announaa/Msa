"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AlertBanner({
  alertId,
  message,
  canResolve,
  resolveLabel,
}: {
  alertId: string;
  message: string;
  canResolve: boolean;
  resolveLabel: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function resolve() {
    setLoading(true);
    await fetch(`/api/academic-alerts/${alertId}`, { method: "PATCH" });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <span>⚠ {message}</span>
      {canResolve && (
        <button
          onClick={resolve}
          disabled={loading}
          className="shrink-0 rounded-lg border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100 disabled:opacity-50"
        >
          {resolveLabel}
        </button>
      )}
    </div>
  );
}
