"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales, type Locale } from "@/lib/dictionaries";

export function LocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(locale: Locale) {
    const segments = pathname.split("/").filter(Boolean);
    segments[0] = locale;
    router.push("/" + segments.join("/"));
    router.refresh();
  }

  return (
    <div className="flex gap-1 text-sm">
      {locales.map((locale) => (
        <button
          key={locale}
          onClick={() => switchTo(locale)}
          className={`rounded-lg px-2 py-1 ${
            locale === current ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          {locale === "ar" ? "العربية" : "English"}
        </button>
      ))}
    </div>
  );
}
