"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/dictionaries";

export function LogoutButton({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();

  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${locale}/login`);
    router.refresh();
  }

  return (
    <button onClick={onClick} className="text-sm font-medium text-slate-500 hover:text-red-600">
      {label}
    </button>
  );
}
