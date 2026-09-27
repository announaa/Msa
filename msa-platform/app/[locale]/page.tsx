import Link from "next/link";
import { db } from "@/lib/db";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export default async function LandingPage({ params }: { params: { locale: Locale } }) {
  const dict = getDictionary(params.locale);
  const announcements = await db.announcement.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  return (
    <div>
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="text-sm font-semibold text-brand-700">{dict.common.appName}</div>
        <nav className="flex items-center gap-4">
          <LocaleSwitcher current={params.locale} />
          <Link href={`/${params.locale}/login`} className="text-sm font-medium text-slate-700 hover:text-brand-700">
            {dict.common.login}
          </Link>
          <Link
            href={`/${params.locale}/register`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {dict.common.enrollNow}
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-600">{dict.common.parentBrand}</p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{dict.landing.heroTitle}</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">{dict.landing.heroSubtitle}</p>
        <Link
          href={`/${params.locale}/register`}
          className="mt-8 inline-block rounded-lg bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
        >
          {dict.landing.ctaRegister}
        </Link>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-20">
        <h2 className="mb-4 text-xl font-semibold">{dict.landing.announcementsTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {announcements.length === 0 && <p className="text-slate-500">—</p>}
          {announcements.map((a) => (
            <article key={a.id} className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="font-semibold">{a.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{a.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
