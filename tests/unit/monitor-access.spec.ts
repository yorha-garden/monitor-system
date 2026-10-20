import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from "jose";
import { normalizeTeamDomain, verifyAccessJwt } from "../../lib/monitor/access";

const AUD = "test-aud";

let server: Server;
let teamDomain: string;
let privateKey: CryptoKey;
let otherKey: CryptoKey;

// A stand-in for https://<team>.cloudflareaccess.com serving the Access signing keys.
test.beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair("RS256")).privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256", use: "sig" };

  server = createServer((req, res) => {
    if (req.url === "/cdn-cgi/access/certs") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ keys: [jwk] }));
    } else {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  teamDomain = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

function sign(key: CryptoKey, claims: { aud?: string; iss?: string; exp?: string } = {}) {
  return new SignJWT({ email: "operator@example.com" })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuer(claims.iss ?? teamDomain)
    .setAudience(claims.aud ?? AUD)
    .setIssuedAt()
    .setExpirationTime(claims.exp ?? "5m")
    .sign(key);
}

const env = () => ({ NODE_ENV: "production", CF_ACCESS_TEAM_DOMAIN: teamDomain, CF_ACCESS_AUD: AUD }) as NodeJS.ProcessEnv;

test.describe("cloudflare access verification", () => {
  test("accepts a valid token and returns the email", async () => {
    expect(await verifyAccessJwt(await sign(privateKey), env())).toEqual({
      ok: true,
      email: "operator@example.com",
    });
  });

  test("rejects a missing, foreign, expired, wrong-audience or wrong-issuer token", async () => {
    const rejected = [
      null,
      "not-a-jwt",
      await sign(otherKey),
      await sign(privateKey, { exp: "-1m" }),
      await sign(privateKey, { aud: "someone-else" }),
      await sign(privateKey, { iss: "https://evil.cloudflareaccess.com" }),
    ];
    for (const token of rejected) {
      expect((await verifyAccessJwt(token, env())).ok, String(token)).toBe(false);
    }
  });

  test("fails closed when access is not configured", async () => {
    const token = await sign(privateKey);
    expect(await verifyAccessJwt(token, { NODE_ENV: "production" } as NodeJS.ProcessEnv)).toEqual({
      ok: false,
      reason: "Cloudflare Access is not configured.",
    });
  });

  test("only skips verification in development when explicitly asked", async () => {
    const skip = { DASHBOARD_DEV_SKIP_ACCESS: "1" };
    expect((await verifyAccessJwt(null, { ...skip, NODE_ENV: "development" } as NodeJS.ProcessEnv)).ok).toBe(true);
    expect((await verifyAccessJwt(null, { ...skip, NODE_ENV: "production" } as NodeJS.ProcessEnv)).ok).toBe(false);
  });

  test("normalizes the team domain", () => {
    expect(normalizeTeamDomain("garden.cloudflareaccess.com")).toBe("https://garden.cloudflareaccess.com");
    expect(normalizeTeamDomain("https://garden.cloudflareaccess.com/")).toBe("https://garden.cloudflareaccess.com");
  });
});
