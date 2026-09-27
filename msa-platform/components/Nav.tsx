import Link from "next/link";
import type { Role } from "@prisma/client";
import type { Dictionary, Locale } from "@/lib/dictionaries";
import { canAccessModule, type ModuleKey } from "@/lib/rbac";
import { LogoutButton } from "@/components/LogoutButton";

const LINKS: { key: ModuleKey; href: string; labelKey: keyof Dictionary["nav"] }[] = [
  { key: "dashboard", href: "dashboard", labelKey: "dashboard" },
  { key: "students", href: "students", labelKey: "students" },
  { key: "tasks", href: "tasks", labelKey: "tasks" },
  { key: "attendance", href: "attendance", labelKey: "attendance" },
  { key: "attendance-scan", href: "attendance/scan", labelKey: "scan" },
  { key: "registrations", href: "registrations", labelKey: "registrations" },
];

export function Nav({ locale, role, dict }: { locale: Locale; role: Role; dict: Dictionary }) {
  return (
    <aside className="w-56 shrink-0 border-e bg-white p-4">
      <div className="mb-6 text-sm font-semibold text-brand-700">{dict.common.appName}</div>
      <nav className="flex flex-col gap-1">
        {LINKS.filter((link) => canAccessModule(role, link.key)).map((link) => (
          <Link
            key={link.key}
            href={`/${locale}/${link.href}`}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            {dict.nav[link.labelKey]}
          </Link>
        ))}
      </nav>
      <div className="mt-8">
        <LogoutButton locale={locale} label={dict.common.logout} />
      </div>
    </aside>
  );
}
