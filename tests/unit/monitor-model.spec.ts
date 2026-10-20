import { expect, test } from "@playwright/test";
import {
  classifyStatus,
  dnsHostnamesByTunnel,
  formatDuration,
  isDomainHostname,
  probeUrl,
  routeHostnames,
  summarizeTraffic,
  toConnector,
  toRoutes,
  toTunnel,
  tunnelIdFromTarget,
  tunnelRoutes,
} from "../../lib/monitor/model";

test.describe("monitor model", () => {
  test("matches the domain and its subdomains only", () => {
    expect(isDomainHostname("yorhagarden.xyz", "yorhagarden.xyz")).toBe(true);
    expect(isDomainHostname("Monitor.YorhaGarden.xyz", "yorhagarden.xyz")).toBe(true);
    expect(isDomainHostname("notyorhagarden.xyz", "yorhagarden.xyz")).toBe(false);
    expect(isDomainHostname("yorhagarden.xyz.evil.com", "yorhagarden.xyz")).toBe(false);
  });

  test("keeps only routes under the domain and drops the catch-all", () => {
    const routes = toRoutes(
      [
        { hostname: "yorhagarden.xyz", service: "http://localhost:8080" },
        { hostname: "api.yorhagarden.xyz", service: "http://localhost:4000", path: "/v1" },
        { hostname: "other.example", service: "http://localhost:9000" },
        { service: "http_status:404" },
      ],
      "yorhagarden.xyz",
    );
    expect(routes).toEqual([
      { hostname: "yorhagarden.xyz", service: "http://localhost:8080" },
      { hostname: "api.yorhagarden.xyz", service: "http://localhost:4000", path: "/v1" },
    ]);
    expect(toRoutes(undefined, "yorhagarden.xyz")).toEqual([]);
  });

  test("reads the tunnel id from a cfargotunnel.com target", () => {
    const id = "c0ffee00-1234-4abc-8def-0123456789ab";
    expect(tunnelIdFromTarget(`${id}.cfargotunnel.com`)).toBe(id);
    expect(tunnelIdFromTarget(`${id.toUpperCase()}.CFARGOTUNNEL.COM.`)).toBe(id);
    expect(tunnelIdFromTarget(`${id}.fed-cfargotunnel.com`)).toBe(id);
    expect(tunnelIdFromTarget("yorhagarden.xyz")).toBeNull();
    expect(tunnelIdFromTarget(`${id}.cfargotunnel.com.evil.com`)).toBeNull();
    expect(tunnelIdFromTarget(`x.${id}.cfargotunnel.com`)).toBeNull();
  });

  test("maps each tunnel to the proxied CNAMEs under the domain that point at it", () => {
    const cname = (name: string, content: string, proxied = true) => ({ name, type: "CNAME", content, proxied });
    const hosts = dnsHostnamesByTunnel(
      [
        cname("Shop.yorhagarden.xyz", "t1.cfargotunnel.com"),
        cname("api.yorhagarden.xyz", "t1.cfargotunnel.com"),
        cname("api.yorhagarden.xyz", "t1.cfargotunnel.com"),
        cname("yorhagarden.xyz", "t2.cfargotunnel.com"),
        cname("raw.yorhagarden.xyz", "t2.cfargotunnel.com", false),
        cname("www.yorhagarden.xyz", "yorhagarden.xyz"),
        cname("lokerin.other.example", "t3.cfargotunnel.com"),
        { name: "txt.yorhagarden.xyz", type: "TXT", content: "t4.cfargotunnel.com", proxied: true },
      ],
      "yorhagarden.xyz",
    );
    expect(Object.fromEntries(hosts)).toEqual({
      t1: ["api.yorhagarden.xyz", "shop.yorhagarden.xyz"],
      t2: ["yorhagarden.xyz"],
    });
  });

  test("takes remote tunnels' routes from ingress and local tunnels' from DNS", () => {
    const ingress = [{ hostname: "yorhagarden.xyz", service: "http://localhost:8080" }, { service: "http_status:404" }];
    const dns = ["yorhagarden.xyz", "extra.yorhagarden.xyz"];
    const remote = { id: "t1", name: "remote", status: "healthy" as const, config_src: "cloudflare" as const };
    const local = { id: "t2", name: "local", status: "healthy" as const, config_src: "local" as const };

    expect(tunnelRoutes(remote, ingress, dns, "yorhagarden.xyz")).toEqual([
      { hostname: "yorhagarden.xyz", service: "http://localhost:8080" },
    ]);
    expect(tunnelRoutes(local, undefined, dns, "yorhagarden.xyz")).toEqual([
      { hostname: "yorhagarden.xyz", service: "local config" },
      { hostname: "extra.yorhagarden.xyz", service: "local config" },
    ]);
    expect(tunnelRoutes(local, undefined, undefined, "yorhagarden.xyz")).toEqual([]);
  });

  test("collapses a connector's edge connections into distinct IPs and locations", () => {
    expect(
      toConnector({
        id: "c1",
        arch: "linux_amd64",
        version: "2026.9.3",
        run_at: "2026-10-20T00:00:00Z",
        conns: [
          { colo_name: "sin13", origin_ip: "203.0.113.10" },
          { colo_name: "cgk02", origin_ip: "203.0.113.10" },
          { colo_name: "sin13", origin_ip: "203.0.113.10" },
        ],
      }),
    ).toEqual({
      id: "c1",
      version: "2026.9.3",
      arch: "linux_amd64",
      runAt: "2026-10-20T00:00:00Z",
      originIps: ["203.0.113.10"],
      edges: ["cgk02", "sin13"],
    });
    expect(toConnector({ id: "c2" })).toMatchObject({ version: "unknown", originIps: [], edges: [] });
  });

  test("lists each probe-able hostname once", () => {
    const routes = [
      { hostname: "a.yorhagarden.xyz", service: "x" },
      { hostname: "*.yorhagarden.xyz", service: "x" },
    ];
    const tunnel = (id: string) =>
      toTunnel({ id, name: id, status: "healthy" }, [], [...routes, { hostname: "b.yorhagarden.xyz", service: "x" }]);
    expect(routeHostnames([tunnel("t1"), tunnel("t2")])).toEqual(["a.yorhagarden.xyz", "b.yorhagarden.xyz"]);
  });

  test("sums traffic per hostname and splits 4xx from 5xx", () => {
    const row = (host: string, status: number, count: number) => ({
      count,
      dimensions: { clientRequestHTTPHost: host, edgeResponseStatus: status },
    });
    expect(
      summarizeTraffic([
        row("yorhagarden.xyz", 200, 90),
        row("yorhagarden.xyz", 404, 7),
        row("YorhaGarden.xyz", 530, 3),
        row("api.yorhagarden.xyz", 502, 1),
      ]),
    ).toEqual({
      "yorhagarden.xyz": { requests: 100, clientErrors: 7, serverErrors: 3 },
      "api.yorhagarden.xyz": { requests: 1, clientErrors: 0, serverErrors: 1 },
    });
  });

  test("treats any answer below 500 as up", () => {
    expect(classifyStatus(200)).toBe("up");
    expect(classifyStatus(302)).toBe("up");
    expect(classifyStatus(404)).toBe("up");
    expect(classifyStatus(502)).toBe("down");
    expect(classifyStatus(530)).toBe("down");
  });

  test("fills the probe URL template", () => {
    expect(probeUrl("https://{hostname}/", "yorhagarden.xyz")).toBe("https://yorhagarden.xyz/");
  });

  test("formats durations compactly", () => {
    expect(formatDuration(30_000)).toBe("<1m");
    expect(formatDuration(42 * 60_000)).toBe("42m");
    expect(formatDuration((5 * 60 + 12) * 60_000)).toBe("5h 12m");
    expect(formatDuration((3 * 1440 + 4 * 60) * 60_000)).toBe("3d 4h");
  });
});
