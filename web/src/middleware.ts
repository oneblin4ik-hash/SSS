import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/register"];

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "");
}

async function isAuthed(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("pp_session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public tracked-link redirect — anyone can hit it, logged in or not.
  if (pathname.startsWith("/r/")) return NextResponse.next();

  const authed = await isAuthed(req);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (authed && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (!authed && !isPublic) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
