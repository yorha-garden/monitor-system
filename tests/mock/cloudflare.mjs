// Stand-in for the Cloudflare API, the Access signing keys and the probed hostnames, used by the
// dashboard e2e tests. Start with: node tests/mock/cloudflare.mjs <port>
import { createServer } from "node:http";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

const port = Number(process.argv[2] ?? 3199);
const origin = `http://127.0.0.1:${port}`;
const ACCOUNT = "acc-test";
const ZONE = "zone-test";
const TOKEN = "test-token";

const ago = (ms) => new Date(Date.now() - ms).toISOString();
const HOUR = 3_600_000;

const tunnels = [
  { id: "t-alpha", name: "garden-alpha", status: "healthy", config_src: "cloudflare", conns_active_at: ago(48 * HOUR) },
  { id: "t-beta", name: "garden-beta", status: "degraded", config_src: "cloudflare", conns_active_at: ago(HOUR) },
  { id: "t-gamma", name: "garden-gamma", status: "down", config_src: "cloudflare", conns_inactive_at: ago(3 * HOUR) },
  { id: "t-other", name: "other-site", status: "healthy", config_src: "cloudflare" },
  { id: "t-local", name: "local-yaml", status: "healthy", config_src: "local" },
];

// Two servers: 203.0.113.10 runs one connector, 198.51.100.20 runs two.
const connections = {
  "t-alpha": [
    { id: "c-a1", arch: "linux_amd64", version: "2026.9.3", run_at: ago(5 * HOUR), conns: [
      { colo_name: "sin13", origin_ip: "203.0.113.10" },
      { colo_name: "cgk02", origin_ip: "203.0.113.10" },
    ] },
    { id: "c-a2", arch: "linux_arm64", version: "2026.8.0", run_at: ago(50 * HOUR), conns: [
      { colo_name: "sin14", origin_ip: "198.51.100.20" },
    ] },
  ],
  "t-beta": [
    { id: "c-b1", arch: "linux_arm64", version: "2026.8.0", run_at: ago(HOUR), conns: [
      { colo_name: "sin13", origin_ip: "198.51.100.20" },
    ] },
  ],
  "t-gamma": [],
  "t-other": [{ id: "c-o1", version: "2026.9.3", conns: [{ colo_name: "nrt01", origin_ip: "192.0.2.1" }] }],
};

const ingress = {
  "t-alpha": [
    { hostname: "yorhagarden.test", service: "http://localhost:8080" },
    { hostname: "monitor.yorhagarden.test", service: "http://localhost:8080" },
    { service: "http_status:404" },
  ],
  "t-beta": [{ hostname: "api.yorhagarden.test", service: "http://localhost:4000" }, { service: "http_status:404" }],
  "t-gamma": [{ hostname: "old.yorhagarden.test", service: "http://localhost:5000" }, { service: "http_status:404" }],
  "t-other": [{ hostname: "other.example", service: "http://localhost:9000" }, { service: "http_status:404" }],
};

const traffic = [
  ["yorhagarden.test", 200, 1200],
  ["yorhagarden.test", 404, 30],
  ["api.yorhagarden.test", 200, 50],
  ["api.yorhagarden.test", 502, 7],
  ["monitor.yorhagarden.test", 200, 10],
];

const probes = {
  "yorhagarden.test": 200,
  "monitor.yorhagarden.test": 302,
  "api.yorhagarden.test": 502,
  "old.yorhagarden.test": 530,
};

const { publicKey, privateKey } = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(publicKey)), kid: "mock", alg: "RS256", use: "sig" };

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const ok = (result) => ({ success: true, errors: [], messages: [], result });
const fail = (code, message) => ({ success: false, errors: [{ code, message }], messages: [], result: null });

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString() || "{}");
}

createServer(async (req, res) => {
  const url = new URL(req.url, origin);
  const path = url.pathname;

  if (path === "/health") return json(res, 200, { ok: true });
  if (path === "/cdn-cgi/access/certs") return json(res, 200, { keys: [jwk] });

  // Test helper: a signed Access token, optionally for another audience or already expired.
  if (path === "/__token") {
    const token = await new SignJWT({ email: "operator@yorhagarden.test" })
      .setProtectedHeader({ alg: "RS256", kid: "mock" })
      .setIssuer(origin)
      .setAudience(url.searchParams.get("aud") ?? "test-aud")
      .setIssuedAt()
      .setExpirationTime(url.searchParams.get("exp") ?? "10m")
      .sign(privateKey);
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end(token);
  }

  const probe = path.match(/^\/probe\/([^/]+)/);
  if (probe) {
    const status = probes[decodeURIComponent(probe[1])] ?? 404;
    res.writeHead(status, status === 302 ? { Location: "https://example.cloudflareaccess.com/login" } : {});
    return res.end();
  }

  if (!path.startsWith("/client/v4/")) return json(res, 404, fail(7003, "No route"));
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return json(res, 403, fail(10000, "Authentication error"));

  const api = path.slice("/client/v4".length);
  if (api === `/accounts/${ACCOUNT}/cfd_tunnel`) return json(res, 200, ok(tunnels));

  const tunnelPath = api.match(new RegExp(`^/accounts/${ACCOUNT}/cfd_tunnel/([^/]+)/(connections|configurations)$`));
  if (tunnelPath) {
    const [, id, kind] = tunnelPath;
    if (kind === "connections") return json(res, 200, ok(connections[id] ?? []));
    const tunnel = tunnels.find((t) => t.id === id);
    if (tunnel?.config_src !== "cloudflare") return json(res, 400, fail(1000, "Tunnel is locally configured"));
    return json(res, 200, ok({ tunnel_id: id, version: 3, source: "cloudflare", config: { ingress: ingress[id] } }));
  }

  if (api === "/graphql" && req.method === "POST") {
    const { variables } = await readBody(req);
    if (variables?.zoneTag !== ZONE) return json(res, 200, { data: null, errors: [{ message: "zone not found" }] });
    const hosts = new Set(variables.hosts ?? []);
    const rows = traffic
      .filter(([host]) => hosts.has(host))
      .map(([host, status, count]) => ({ count, dimensions: { clientRequestHTTPHost: host, edgeResponseStatus: status } }));
    return json(res, 200, { data: { viewer: { zones: [{ httpRequestsAdaptiveGroups: rows }] } }, errors: null });
  }

  return json(res, 404, fail(7003, "No route"));
}).listen(port, "127.0.0.1");
