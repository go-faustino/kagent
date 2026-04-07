import type {
  KubernetesNetworkPolicyEgressRule,
  KubernetesNetworkPolicyIngressRule,
  KubernetesNetworkPolicyPeer,
  KubernetesNetworkPolicyPort,
  SandboxNetworkPolicySpec,
} from "@/types";

export type ParseSandboxNetworkPolicyResult =
  | { ok: true; spec: SandboxNetworkPolicySpec | undefined }
  | { ok: false; error: string };

/**
 * Parses optional JSON for spec.sandbox.networkPolicy (ingress/egress only).
 * Empty or whitespace-only input yields undefined (use controller defaults when Managed).
 */
export function parseSandboxNetworkPolicyJson(raw: string): ParseSandboxNetworkPolicyResult {
  const t = raw.trim();
  if (!t) {
    return { ok: true, spec: undefined };
  }
  let v: unknown;
  try {
    v = JSON.parse(t) as unknown;
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  if (v === null || typeof v !== "object" || Array.isArray(v)) {
    return { ok: false, error: "Network policy must be a JSON object" };
  }
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o);
  const unknownKeys = keys.filter((k) => k !== "ingress" && k !== "egress");
  if (unknownKeys.length > 0) {
    return { ok: false, error: `Unknown keys: ${unknownKeys.join(", ")}` };
  }
  if (o.ingress !== undefined && !Array.isArray(o.ingress)) {
    return { ok: false, error: "ingress must be an array" };
  }
  if (o.egress !== undefined && !Array.isArray(o.egress)) {
    return { ok: false, error: "egress must be an array" };
  }
  const spec: SandboxNetworkPolicySpec = {};
  if (o.ingress !== undefined) {
    spec.ingress = o.ingress as SandboxNetworkPolicySpec["ingress"];
  }
  if (o.egress !== undefined) {
    spec.egress = o.egress as SandboxNetworkPolicySpec["egress"];
  }
  return { ok: true, spec };
}

export function isSandboxNetworkPolicySpecEmpty(spec: SandboxNetworkPolicySpec | undefined): boolean {
  if (!spec) {
    return true;
  }
  const hasIngress = Array.isArray(spec.ingress) && spec.ingress.length > 0;
  const hasEgress = Array.isArray(spec.egress) && spec.egress.length > 0;
  return !hasIngress && !hasEgress;
}

function isLikelyIPv4Cidr(s: string): boolean {
  const t = s.trim();
  const parts = t.split("/");
  if (parts.length !== 2) {
    return false;
  }
  const mask = parseInt(parts[1], 10);
  if (Number.isNaN(mask) || mask < 0 || mask > 32) {
    return false;
  }
  const oct = parts[0].split(".");
  if (oct.length !== 4) {
    return false;
  }
  return oct.every((o) => {
    const n = parseInt(o, 10);
    return !Number.isNaN(n) && n >= 0 && n <= 255;
  });
}

function cleanPeer(p: KubernetesNetworkPolicyPeer): KubernetesNetworkPolicyPeer | undefined {
  const out: KubernetesNetworkPolicyPeer = {};
  if (p.podSelector?.matchLabels && Object.keys(p.podSelector.matchLabels).length > 0) {
    const labels: Record<string, string> = {};
    for (const [k, v] of Object.entries(p.podSelector.matchLabels)) {
      const ks = k.trim();
      const vs = String(v).trim();
      if (ks && vs) {
        labels[ks] = vs;
      }
    }
    if (Object.keys(labels).length > 0) {
      out.podSelector = { matchLabels: labels };
    }
  }
  if (p.namespaceSelector?.matchLabels && Object.keys(p.namespaceSelector.matchLabels).length > 0) {
    const labels: Record<string, string> = {};
    for (const [k, v] of Object.entries(p.namespaceSelector.matchLabels)) {
      const ks = k.trim();
      const vs = String(v).trim();
      if (ks && vs) {
        labels[ks] = vs;
      }
    }
    if (Object.keys(labels).length > 0) {
      out.namespaceSelector = { matchLabels: labels };
    }
  }
  if (p.ipBlock?.cidr?.trim()) {
    out.ipBlock = {
      cidr: p.ipBlock.cidr.trim(),
      except: p.ipBlock.except?.map((e) => e.trim()).filter(Boolean),
    };
    if (!out.ipBlock.except?.length) {
      delete out.ipBlock.except;
    }
  }
  if (Object.keys(out).length === 0) {
    return undefined;
  }
  return out;
}

function cleanPort(p: KubernetesNetworkPolicyPort): KubernetesNetworkPolicyPort | undefined {
  const protocol = p.protocol?.trim() as KubernetesNetworkPolicyPort["protocol"] | undefined;
  const rawPort = p.port;
  const hasPort =
    rawPort !== undefined &&
    rawPort !== "" &&
    !(typeof rawPort === "string" && rawPort.trim() === "");
  const endPort = p.endPort;
  if (!protocol && !hasPort && endPort === undefined) {
    return undefined;
  }
  const out: KubernetesNetworkPolicyPort = {};
  if (protocol) {
    out.protocol = protocol;
  }
  if (hasPort) {
    if (typeof rawPort === "number") {
      out.port = rawPort;
    } else {
      const s = String(rawPort).trim();
      const n = parseInt(s, 10);
      if (s !== "" && !Number.isNaN(n) && String(n) === s) {
        out.port = n;
      } else {
        out.port = s;
      }
    }
  }
  if (endPort !== undefined && endPort !== null && !Number.isNaN(Number(endPort))) {
    out.endPort = Number(endPort);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function cleanIngressRule(r: KubernetesNetworkPolicyIngressRule): KubernetesNetworkPolicyIngressRule | undefined {
  const from = r.from?.map(cleanPeer).filter(Boolean) as KubernetesNetworkPolicyPeer[] | undefined;
  const ports = r.ports?.map(cleanPort).filter(Boolean) as KubernetesNetworkPolicyPort[] | undefined;
  const out: KubernetesNetworkPolicyIngressRule = {};
  if (from && from.length > 0) {
    out.from = from;
  }
  if (ports && ports.length > 0) {
    out.ports = ports;
  }
  if (!out.from && !out.ports) {
    return undefined;
  }
  return out;
}

function cleanEgressRule(r: KubernetesNetworkPolicyEgressRule): KubernetesNetworkPolicyEgressRule | undefined {
  const to = r.to?.map(cleanPeer).filter(Boolean) as KubernetesNetworkPolicyPeer[] | undefined;
  const ports = r.ports?.map(cleanPort).filter(Boolean) as KubernetesNetworkPolicyPort[] | undefined;
  const out: KubernetesNetworkPolicyEgressRule = {};
  if (to && to.length > 0) {
    out.to = to;
  }
  if (ports && ports.length > 0) {
    out.ports = ports;
  }
  if (!out.to && !out.ports) {
    return undefined;
  }
  return out;
}

/** Strips empty peers, ports, and rules for the API payload. */
export function buildSandboxNetworkPolicyPayload(
  spec: SandboxNetworkPolicySpec | undefined
): SandboxNetworkPolicySpec | undefined {
  if (!spec) {
    return undefined;
  }
  const ingress = spec.ingress?.map(cleanIngressRule).filter(Boolean) as KubernetesNetworkPolicyIngressRule[];
  const egress = spec.egress?.map(cleanEgressRule).filter(Boolean) as KubernetesNetworkPolicyEgressRule[];
  const out: SandboxNetworkPolicySpec = {};
  if (ingress && ingress.length > 0) {
    out.ingress = ingress;
  }
  if (egress && egress.length > 0) {
    out.egress = egress;
  }
  return isSandboxNetworkPolicySpecEmpty(out) ? undefined : out;
}

/**
 * Validates user-authored spec before submit (structured editor).
 * Returns an error message or undefined if OK.
 */
export function validateSandboxNetworkPolicySpec(spec: SandboxNetworkPolicySpec | undefined): string | undefined {
  if (!spec || isSandboxNetworkPolicySpecEmpty(spec)) {
    return undefined;
  }
  const checkPeers = (peers: KubernetesNetworkPolicyPeer[] | undefined, label: string): string | undefined => {
    if (!peers) {
      return undefined;
    }
    for (let i = 0; i < peers.length; i++) {
      const p = peers[i];
      if (p.ipBlock?.cidr?.trim() && !isLikelyIPv4Cidr(p.ipBlock.cidr)) {
        return `${label}: peer ${i + 1} has invalid CIDR (expected IPv4 like 10.0.0.0/8)`;
      }
    }
    return undefined;
  };
  const checkPorts = (ports: KubernetesNetworkPolicyPort[] | undefined, label: string): string | undefined => {
    if (!ports) {
      return undefined;
    }
    for (let i = 0; i < ports.length; i++) {
      const p = ports[i];
      if (p.protocol && !["TCP", "UDP", "SCTP"].includes(p.protocol)) {
        return `${label}: port ${i + 1} has invalid protocol`;
      }
      if (p.port !== undefined && p.port !== "") {
        if (typeof p.port === "number") {
          if (p.port < 1 || p.port > 65535) {
            return `${label}: port ${i + 1} must be between 1 and 65535`;
          }
        } else {
          const s = String(p.port).trim();
          const n = parseInt(s, 10);
          if (!Number.isNaN(n) && String(n) === s && (n < 1 || n > 65535)) {
            return `${label}: port ${i + 1} must be between 1 and 65535`;
          }
        }
      }
      if (p.endPort !== undefined) {
        const e = Number(p.endPort);
        if (Number.isNaN(e) || e < 1 || e > 65535) {
          return `${label}: endPort ${i + 1} must be between 1 and 65535`;
        }
      }
    }
    return undefined;
  };
  if (spec.ingress) {
    for (let r = 0; r < spec.ingress.length; r++) {
      const rule = spec.ingress[r];
      const err =
        checkPeers(rule.from, `Ingress rule ${r + 1}`) ||
        checkPorts(rule.ports, `Ingress rule ${r + 1}`);
      if (err) {
        return err;
      }
    }
  }
  if (spec.egress) {
    for (let r = 0; r < spec.egress.length; r++) {
      const rule = spec.egress[r];
      const err =
        checkPeers(rule.to, `Egress rule ${r + 1}`) ||
        checkPorts(rule.ports, `Egress rule ${r + 1}`);
      if (err) {
        return err;
      }
    }
  }
  return undefined;
}
