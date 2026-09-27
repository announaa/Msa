import Link from "next/link";
import { db } from "@/lib/db";
import { getDictionary, type Locale } from "@/lib/dictionaries";

export default async function AnnouncementsPage({ params }: { params: { locale: Locale } }) {
  const dict = getDictionary(params.locale);
  const announcements = await db.announcement.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href={`/${params.locale}`} className="text-sm text-brand-600 hover:underline">
        {dict.common.back}
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{dict.landing.announcementsTitle}</h1>
      <div className="space-y-4">
        {announcements.map((a) => (
          <article key={a.id} className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold">{a.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{a.body}</p>
            <p className="mt-2 text-xs text-slate-400">{a.createdAt.toLocaleDateString(params.locale)}</p>
          </article>
        ))}
        {announcements.length === 0 && <p className="text-slate-500">—</p>}
      </div>
    </div>
  );
}
