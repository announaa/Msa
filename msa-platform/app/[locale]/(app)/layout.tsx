import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { Nav } from "@/components/Nav";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  const session = await getSession();
  if (!session) {
    redirect(`/${params.locale}/login`);
  }

  const dict = getDictionary(params.locale);

  return (
    <div className="flex min-h-screen">
      <Nav locale={params.locale} role={session.role} dict={dict} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
