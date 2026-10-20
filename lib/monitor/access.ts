import { createRemoteJWKSet, jwtVerify } from "jose";

// Cloudflare Access puts the signed login token on every request it lets through to the origin.
export const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

export type AccessResult = { ok: true; email?: string } | { ok: false; reason: string };

// Accepts "team.cloudflareaccess.com" or a full origin; the token's `iss` is the https origin.
export function normalizeTeamDomain(value: string) {
  const withScheme = /^https?:\/\//.test(value) ? value : `https://${value}`;
  return withScheme.replace(/\/+$/, "");
}

// One key set per team domain, so signing keys are fetched once and refreshed by jose on rotation.
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function keySet(teamDomain: string) {
  let set = keySets.get(teamDomain);
  if (!set) {
    set = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    keySets.set(teamDomain, set);
  }
  return set;
}

// Fails closed: without a configured team domain and audience, nobody gets in.
export async function verifyAccessJwt(
  token: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AccessResult> {
  if (env.NODE_ENV === "development" && env.DASHBOARD_DEV_SKIP_ACCESS === "1") {
    return { ok: true, email: "development" };
  }

  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN && normalizeTeamDomain(env.CF_ACCESS_TEAM_DOMAIN);
  const audience = env.CF_ACCESS_AUD;
  if (!teamDomain || !audience) return { ok: false, reason: "Cloudflare Access is not configured." };
  if (!token) return { ok: false, reason: "Missing Cloudflare Access token." };

  try {
    const { payload } = await jwtVerify(token, keySet(teamDomain), {
      issuer: teamDomain,
      audience,
      algorithms: ["RS256"],
    });
    return { ok: true, email: typeof payload.email === "string" ? payload.email : undefined };
  } catch {
    return { ok: false, reason: "Invalid Cloudflare Access token." };
  }
}
