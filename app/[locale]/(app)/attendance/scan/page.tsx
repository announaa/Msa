import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { canAccessModule } from "@/lib/rbac";
import { ScanKiosk } from "@/components/ScanKiosk";

export default async function ScanPage({ params }: { params: { locale: Locale } }) {
  const session = (await getSession())!;
  if (!canAccessModule(session.role, "attendance-scan")) {
    redirect(`/${params.locale}/dashboard`);
  }
  const dict = getDictionary(params.locale);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">{dict.nav.scan}</h1>
      <ScanKiosk
        prompt={dict.attendance.scanPrompt}
        checkedInLabel={dict.attendance.checkedIn}
        checkedOutLabel={dict.attendance.checkedOut}
        durationLabel={dict.attendance.duration}
      />
    </div>
  );
}
