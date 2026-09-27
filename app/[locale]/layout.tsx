import type { Metadata } from "next";
import "@/app/globals.css";
import { locales, isLocale, defaultLocale } from "@/lib/dictionaries";

// Pages under this layout read live data from the database, so render them per request instead of at build time.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: "MSA — Make Studying Amazing",
  description: "AS HUB | MSA education-center management platform",
};

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = isLocale(params.locale) ? params.locale : defaultLocale;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
