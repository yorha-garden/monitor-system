import { expect, test } from "@playwright/test";
import type { ProbeResult, Tunnel, TunnelStatus } from "../../lib/monitor/model";
import { edgeCity, toPublicStatus } from "../../lib/monitor/public-status";

const generatedAt = new Date("2026-10-20T11:00:00Z");

function tunnel(status: TunnelStatus, edges: string[] = []): Tunnel {
  return {
    id: status,
    name: status,
    status,
    activeAt: null,
    inactiveAt: null,
    connectors: edges.length ? [{ id: "c", version: "x", arch: "x", runAt: null, originIps: ["203.0.113.10"], edges }] : [],
    routes: [{ hostname: "a.yorhagarden.xyz", service: "http://localhost:8080" }],
  };
}

const probe = (hostname: string, state: ProbeResult["state"]): ProbeResult => ({ hostname, state, ms: 10 });

test.describe("public status summary", () => {
  test("names edge locations after their city", () => {
    expect(edgeCity("cgk01")).toBe("Jakarta");
    expect(edgeCity("SIN13")).toBe("Singapore");
    expect(edgeCity("xyz02")).toBe("XYZ");
  });

  test("is green only when every tunnel is healthy and every hostname answers", () => {
    const status = toPublicStatus({
      generatedAt,
      tunnels: [tunnel("healthy", ["sin13", "cgk02", "sin14"])],
      probes: { a: probe("a", "up"), b: probe("b", "up") },
      errors: [],
    });
    expect(status).toEqual({
      state: "ok",
      vitals: "green",
      tunnelsOnline: 1,
      tunnelsTotal: 1,
      hostnamesUp: 2,
      hostnamesTotal: 2,
      edges: ["Jakarta", "Singapore"],
      checkedAt: "2026-10-20T11:00:00.000Z",
    });
  });

  test("counts degraded tunnels as online but reports degraded vitals", () => {
    const status = toPublicStatus({
      generatedAt,
      tunnels: [tunnel("healthy"), tunnel("degraded"), tunnel("down")],
      probes: { a: probe("a", "up"), b: probe("b", "down") },
      errors: [],
    });
    expect(status).toMatchObject({ vitals: "degraded", tunnelsOnline: 2, tunnelsTotal: 3, hostnamesUp: 1, hostnamesTotal: 2 });
  });

  test("reports offline when no tunnel is connected", () => {
    const status = toPublicStatus({ generatedAt, tunnels: [tunnel("down"), tunnel("inactive")], probes: {}, errors: [] });
    expect(status).toMatchObject({ vitals: "offline", tunnelsOnline: 0 });
  });

  test("is unavailable when the monitor could not load any tunnels", () => {
    expect(toPublicStatus({ generatedAt, tunnels: [], probes: {}, errors: ["Could not load tunnels"] })).toEqual({
      state: "unavailable",
    });
  });

  test("never exposes addresses or hostnames", () => {
    const text = JSON.stringify(
      toPublicStatus({ generatedAt, tunnels: [tunnel("healthy", ["sin13"])], probes: { a: probe("a.yorhagarden.xyz", "up") }, errors: [] }),
    );
    expect(text).not.toContain("203.0.113.10");
    expect(text).not.toContain("yorhagarden.xyz");
    expect(text).not.toContain("localhost");
  });
});
