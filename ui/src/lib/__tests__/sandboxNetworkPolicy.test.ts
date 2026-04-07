import { describe, expect, it } from "@jest/globals";
import {
  buildSandboxNetworkPolicyPayload,
  isSandboxNetworkPolicySpecEmpty,
  parseSandboxNetworkPolicyJson,
  validateSandboxNetworkPolicySpec,
} from "../sandboxNetworkPolicy";

describe("parseSandboxNetworkPolicyJson", () => {
  it("accepts empty input as undefined spec", () => {
    expect(parseSandboxNetworkPolicyJson("")).toEqual({ ok: true, spec: undefined });
    expect(parseSandboxNetworkPolicyJson("   ")).toEqual({ ok: true, spec: undefined });
  });

  it("parses ingress only", () => {
    const raw = JSON.stringify({ ingress: [{ ports: [{ port: 8080 }] }] });
    const r = parseSandboxNetworkPolicyJson(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec?.ingress).toHaveLength(1);
      expect(r.spec?.egress).toBeUndefined();
    }
  });

  it("rejects invalid JSON", () => {
    const r = parseSandboxNetworkPolicyJson("{");
    expect(r.ok).toBe(false);
  });

  it("rejects non-object", () => {
    expect(parseSandboxNetworkPolicyJson("[]").ok).toBe(false);
  });

  it("rejects unknown keys", () => {
    const r = parseSandboxNetworkPolicyJson('{"podSelector":{}}');
    expect(r.ok).toBe(false);
  });
});

describe("isSandboxNetworkPolicySpecEmpty", () => {
  it("treats undefined and empty as empty", () => {
    expect(isSandboxNetworkPolicySpecEmpty(undefined)).toBe(true);
    expect(isSandboxNetworkPolicySpecEmpty({})).toBe(true);
    expect(isSandboxNetworkPolicySpecEmpty({ ingress: [], egress: [] })).toBe(true);
  });

  it("detects rules", () => {
    expect(isSandboxNetworkPolicySpecEmpty({ ingress: [{ from: [] }] })).toBe(false);
  });
});

describe("buildSandboxNetworkPolicyPayload", () => {
  it("returns undefined when nothing meaningful remains", () => {
    expect(
      buildSandboxNetworkPolicyPayload({
        ingress: [{ from: [{ podSelector: { matchLabels: {} } }], ports: [] }],
      })
    ).toBeUndefined();
  });

  it("keeps ingress with labels and ports", () => {
    const p = buildSandboxNetworkPolicyPayload({
      ingress: [
        {
          from: [{ podSelector: { matchLabels: { app: "x" } } }],
          ports: [{ protocol: "TCP", port: 8080 }],
        },
      ],
    });
    expect(p?.ingress?.[0].from?.[0].podSelector?.matchLabels).toEqual({ app: "x" });
    expect(p?.ingress?.[0].ports?.[0].port).toBe(8080);
  });
});

describe("validateSandboxNetworkPolicySpec", () => {
  it("accepts valid CIDR", () => {
    expect(
      validateSandboxNetworkPolicySpec({
        ingress: [{ from: [{ ipBlock: { cidr: "10.0.0.0/8" } }], ports: [] }],
      })
    ).toBeUndefined();
  });

  it("rejects bad CIDR", () => {
    expect(
      validateSandboxNetworkPolicySpec({
        ingress: [{ from: [{ ipBlock: { cidr: "999.0.0.0/8" } }], ports: [] }],
      })
    ).toMatch(/invalid CIDR/);
  });
});
