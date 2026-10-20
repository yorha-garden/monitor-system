import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_JWT_HEADER, verifyAccessJwt } from "./lib/monitor/access";
import { isDashboardHost } from "./lib/monitor/host";

const DASHBOARD_PATH = "/dashboard";

function isDashboardPath(pathname: string) {
  return pathname === DASHBOARD_PATH || pathname.startsWith(`${DASHBOARD_PATH}/`);
}

function plain(status: number, body: string) {
  return new NextResponse(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

// The URL the visitor used, rebuilt from the Host header (already checked against DASHBOARD_HOST)
// and the forwarded protocol. request.url can't be used for this: its origin comes from the
// server's bind address (https://localhost:8080 behind cloudflared). A rewrite or redirect built
// from it either sends the browser to localhost or makes Next proxy to it as an external URL.
function publicUrl(request: NextRequest, path: string) {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol = forwarded === "https" || forwarded === "http" ? forwarded : request.nextUrl.protocol.slice(0, -1);
  return new URL(path, `${protocol}://${request.headers.get("host")}`);
}

// Serves the dashboard on its own hostname (DASHBOARD_HOST, e.g. monitor.yorhagarden.xyz) and
// nowhere else. Requests to that host must carry a valid Cloudflare Access token.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isDashboardHost(request.headers.get("host"))) {
    return isDashboardPath(pathname) ? plain(404, "Not found") : NextResponse.next();
  }

  const access = await verifyAccessJwt(request.headers.get(ACCESS_JWT_HEADER));
  if (!access.ok) return plain(403, `Access denied. ${access.reason}`);

  if (pathname === "/") return NextResponse.redirect(publicUrl(request, DASHBOARD_PATH), 307);
  if (isDashboardPath(pathname)) return NextResponse.next();
  return plain(404, "Not found");
}

export const config = {
  // Static build assets and the favicon are public on every host.
  matcher: ["/((?!_next/static|_next/image|icon.svg).*)"],
};
