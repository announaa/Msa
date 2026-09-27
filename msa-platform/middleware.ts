import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { locales, defaultLocale, isLocale } from "@/lib/dictionaries";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

// Sections reachable without a session. Everything else under a locale
// prefix requires a valid session cookie — this is the coarse gate;
// per-role and per-record checks happen again in the route/page itself.
const PUBLIC_SECTIONS = new Set(["", "announcements", "register", "login"]);

function secretKey() {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? "");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  if (!first || !isLocale(first)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = first;
  const section = segments[1] ?? "";

  if (PUBLIC_SECTIONS.has(section)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, secretKey());
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
