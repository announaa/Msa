import { getDictionary, type Locale } from "@/lib/dictionaries";
import { db } from "@/lib/db";
import { RegistrationRow } from "@/components/RegistrationRow";

export default async function RegistrationsPage({ params }: { params: { locale: Locale } }) {
  const dict = getDictionary(params.locale);
  const requests = await db.registrationRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{dict.registrations.title}</h1>
      <div className="space-y-3">
        {requests.map((r) => (
          <RegistrationRow key={r.id} request={r} dict={dict} />
        ))}
        {requests.length === 0 && <p className="text-sm text-slate-500">{dict.registrations.noRequests}</p>}
      </div>
    </div>
  );
}
