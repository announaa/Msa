"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type ScanResult = {
  name: string;
  type: "in" | "out";
  time: string;
  duration?: string;
};

export function ScanKiosk({
  prompt,
  checkedInLabel,
  checkedOutLabel,
  durationLabel,
}: {
  prompt: string;
  checkedInLabel: string;
  checkedOutLabel: string;
  durationLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Most inexpensive QR scanners act as a keyboard: they "type" the
  // payload into whatever's focused and send Enter. Keeping this input
  // focused at all times turns the kiosk into a plug-and-scan device
  // with no camera/jsQR integration needed.
  useEffect(() => {
    inputRef.current?.focus();
    const refocus = () => inputRef.current?.focus();
    window.addEventListener("click", refocus);
    return () => window.removeEventListener("click", refocus);
  }, []);

  async function submitToken(token: string) {
    setError(null);
    const res = await fetch("/api/attendance/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Scan failed.");
      setResult(null);
      return;
    }
    setResult(data);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (value.trim()) {
      submitToken(value.trim());
      setValue("");
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-lg"
          placeholder={prompt}
          autoFocus
        />
      </form>

      {error && <p className="mt-4 text-center text-red-600">{error}</p>}

      {result && (
        <div className="mt-6 rounded-xl border bg-white p-6 text-center shadow-sm">
          <p className="text-xl font-semibold">{result.name}</p>
          <p className={`mt-1 text-lg font-medium ${result.type === "in" ? "text-green-600" : "text-slate-600"}`}>
            {result.type === "in" ? checkedInLabel : checkedOutLabel} — {result.time}
          </p>
          {result.duration && (
            <p className="mt-1 text-sm text-slate-500">
              {durationLabel}: {result.duration}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
