import { Suspense } from "react";
import type { Locale } from "@/lib/dictionaries";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage({ params }: { params: { locale: Locale } }) {
  return (
    <Suspense fallback={null}>
      <LoginForm locale={params.locale} />
    </Suspense>
  );
}
