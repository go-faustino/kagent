"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  KubernetesNetworkPolicyIngressRule,
  KubernetesNetworkPolicyEgressRule,
  KubernetesNetworkPolicyPeer,
  KubernetesNetworkPolicyPort,
  KubernetesProtocol,
  SandboxNetworkPolicySpec,
} from "@/types";
import { MinusCircle, Plus, Trash2 } from "lucide-react";

export interface NetworkPolicyRulesEditorProps {
  value: SandboxNetworkPolicySpec;
  onChange: (next: SandboxNetworkPolicySpec) => void;
  disabled?: boolean;
}

type PeerKind = "pod" | "namespace" | "ip";

function peerKind(p: KubernetesNetworkPolicyPeer): PeerKind {
  if (p.ipBlock !== undefined) {
    return "ip";
  }
  if (p.namespaceSelector !== undefined) {
    return "namespace";
  }
  return "pod";
}

function emptyPeer(kind: PeerKind): KubernetesNetworkPolicyPeer {
  if (kind === "ip") {
    return { ipBlock: { cidr: "" } };
  }
  if (kind === "namespace") {
    return { namespaceSelector: { matchLabels: {} } };
  }
  return { podSelector: { matchLabels: {} } };
}

function labelPairsFromSelector(sel?: { matchLabels?: Record<string, string> }): { key: string; value: string }[] {
  const m = sel?.matchLabels;
  if (!m || Object.keys(m).length === 0) {
    return [{ key: "", value: "" }];
  }
  return Object.entries(m).map(([key, value]) => ({ key, value: String(value) }));
}

function pairsToMatchLabels(pairs: { key: string; value: string }[]): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const { key, value } of pairs) {
    const k = key.trim();
    const v = value.trim();
    if (k && v) {
      out[k] = v;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function PeerFields({
  peer,
  onPeerChange,
  disabled,
}: {
  peer: KubernetesNetworkPolicyPeer;
  onPeerChange: (p: KubernetesNetworkPolicyPeer) => void;
  disabled?: boolean;
}) {
  const kind = peerKind(peer);

  const setKind = (next: PeerKind) => {
    onPeerChange(emptyPeer(next));
  };

  const pairs =
    kind === "pod"
      ? labelPairsFromSelector(peer.podSelector)
      : kind === "namespace"
        ? labelPairsFromSelector(peer.namespaceSelector)
        : [];

  const updateLabels = (nextPairs: { key: string; value: string }[]) => {
    const labels = pairsToMatchLabels(nextPairs);
    if (kind === "pod") {
      onPeerChange({ podSelector: labels ? { matchLabels: labels } : { matchLabels: {} } });
    } else {
      onPeerChange({
        namespaceSelector: labels ? { matchLabels: labels } : { matchLabels: {} },
      });
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border/70 bg-background/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Match
        </span>
        <div className="flex rounded-md border border-border p-0.5 shadow-sm">
          {(
            [
              ["pod", "Pod labels"],
              ["namespace", "Namespace labels"],
              ["ip", "IP block"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              disabled={disabled}
              onClick={() => setKind(k)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                kind === k
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {kind === "ip" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-1">
            <Label className="text-xs text-muted-foreground">CIDR</Label>
            <Input
              placeholder="10.0.0.0/8"
              value={peer.ipBlock?.cidr ?? ""}
              disabled={disabled}
              onChange={(e) =>
                onPeerChange({
                  ipBlock: {
                    cidr: e.target.value,
                    except: peer.ipBlock?.except,
                  },
                })
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Except (one CIDR per line)</Label>
            <Textarea
              className="min-h-[72px] text-sm"
              placeholder={"172.16.0.0/12\n192.168.0.0/16"}
              disabled={disabled}
              value={(peer.ipBlock?.except ?? []).join("\n")}
              onChange={(e) => {
                const lines = e.target.value
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean);
                onPeerChange({
                  ipBlock: {
                    cidr: peer.ipBlock?.cidr ?? "",
                    except: lines.length ? lines : undefined,
                  },
                });
              }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {pairs.map((row, idx) => (
            <div key={idx} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[8rem] flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Label key</Label>
                <Input
                  placeholder="app"
                  disabled={disabled}
                  value={row.key}
                  onChange={(e) => {
                    const copy = [...pairs];
                    copy[idx] = { ...copy[idx], key: e.target.value };
                    updateLabels(copy);
                  }}
                />
              </div>
              <div className="min-w-[8rem] flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Value</Label>
                <Input
                  placeholder="router"
                  disabled={disabled}
                  value={row.value}
                  onChange={(e) => {
                    const copy = [...pairs];
                    copy[idx] = { ...copy[idx], value: e.target.value };
                    updateLabels(copy);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                disabled={disabled || pairs.length <= 1}
                onClick={() => updateLabels(pairs.filter((_, i) => i !== idx))}
                aria-label="Remove label row"
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={disabled}
            onClick={() => updateLabels([...pairs, { key: "", value: "" }])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add label
          </Button>
        </div>
      )}
    </div>
  );
}

function portRowMeaningful(p: KubernetesNetworkPolicyPort): boolean {
  return !!(
    p.protocol ||
    (p.port !== undefined && p.port !== "") ||
    (p.endPort !== undefined && !Number.isNaN(Number(p.endPort)))
  );
}

function PortsEditor({
  ports,
  onPortsChange,
  disabled,
}: {
  ports: KubernetesNetworkPolicyPort[];
  onPortsChange: (p: KubernetesNetworkPolicyPort[]) => void;
  disabled?: boolean;
}) {
  const rows = ports.length > 0 ? ports : [{}];

  const updateRow = (idx: number, next: KubernetesNetworkPolicyPort) => {
    const base = ports.length > 0 ? [...ports] : [{}];
    base[idx] = next;
    onPortsChange(base);
  };

  const removeRow = (idx: number) => {
    const base = ports.length > 0 ? [...ports] : [{}];
    const copy = base.filter((_, i) => i !== idx);
    onPortsChange(copy.length > 0 ? copy : []);
  };

  return (
    <div className="space-y-2">
      {rows.map((port, idx) => (
        <div
          key={idx}
          className="flex flex-wrap items-end gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2"
        >
          <div className="w-[7.5rem] space-y-1">
            <Label className="text-xs text-muted-foreground">Protocol</Label>
            <Select
              disabled={disabled}
              value={port.protocol ?? "__any__"}
              onValueChange={(v) =>
                updateRow(idx, {
                  ...port,
                  protocol: v === "__any__" ? undefined : (v as KubernetesProtocol),
                })
              }
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any</SelectItem>
                <SelectItem value="TCP">TCP</SelectItem>
                <SelectItem value="UDP">UDP</SelectItem>
                <SelectItem value="SCTP">SCTP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[5rem] flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Port</Label>
            <Input
              className="h-9 text-sm tabular-nums"
              placeholder="8080 or name"
              disabled={disabled}
              value={port.port === undefined || port.port === "" ? "" : String(port.port)}
              onChange={(e) => {
                const t = e.target.value;
                if (t === "") {
                  updateRow(idx, { ...port, port: undefined });
                  return;
                }
                const n = parseInt(t, 10);
                updateRow(idx, {
                  ...port,
                  port: !Number.isNaN(n) && String(n) === t ? n : t,
                });
              }}
            />
          </div>
          <div className="w-[5.5rem] space-y-1">
            <Label className="text-xs text-muted-foreground">End port</Label>
            <Input
              className="h-9 text-sm tabular-nums"
              placeholder="—"
              disabled={disabled}
              value={port.endPort === undefined ? "" : String(port.endPort)}
              onChange={(e) => {
                const t = e.target.value.trim();
                if (t === "") {
                  updateRow(idx, { ...port, endPort: undefined });
                  return;
                }
                const n = parseInt(t, 10);
                updateRow(idx, { ...port, endPort: Number.isNaN(n) ? undefined : n });
              }}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 shrink-0 text-muted-foreground hover:text-destructive"
            disabled={
              disabled ||
              (rows.length === 1 && !portRowMeaningful(port) && ports.length === 0)
            }
            onClick={() => removeRow(idx)}
            aria-label="Remove port"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        disabled={disabled}
        onClick={() => onPortsChange([...(ports.length > 0 ? ports : []), {}])}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add port
      </Button>
    </div>
  );
}

function RuleShell({
  title,
  ruleIndex,
  onRemove,
  children,
  disabled,
}: {
  title: string;
  ruleIndex: number;
  onRemove: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="relative border-l-[3px] border-l-primary/70 pl-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold tracking-tight text-foreground">{title}</h4>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground/90">
            Rule {ruleIndex + 1}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-destructive"
          disabled={disabled}
          onClick={onRemove}
        >
          Remove rule
        </Button>
      </div>
      {children}
    </div>
  );
}

export function NetworkPolicyRulesEditor({ value, onChange, disabled }: NetworkPolicyRulesEditorProps) {
  const ingress = value.ingress ?? [];
  const egress = value.egress ?? [];

  const setIngress = (rules: KubernetesNetworkPolicyIngressRule[]) => {
    onChange({ ...value, ingress: rules.length ? rules : undefined });
  };

  const setEgress = (rules: KubernetesNetworkPolicyEgressRule[]) => {
    onChange({ ...value, egress: rules.length ? rules : undefined });
  };

  const updateIngressRule = (idx: number, rule: KubernetesNetworkPolicyIngressRule) => {
    const copy = [...ingress];
    copy[idx] = rule;
    setIngress(copy);
  };

  const updateEgressRule = (idx: number, rule: KubernetesNetworkPolicyEgressRule) => {
    const copy = [...egress];
    copy[idx] = rule;
    setEgress(copy);
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-2">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Ingress</h3>
            <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-muted-foreground">
              Who may connect to the sandbox pod. Leave rules empty to rely on the controller default when management
              is Managed.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0 shadow-sm"
            disabled={disabled}
            onClick={() => setIngress([...ingress, { from: [emptyPeer("pod")], ports: [{ protocol: "TCP", port: 8080 }] }])}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add ingress rule
          </Button>
        </div>

        {ingress.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/80 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground">
            No ingress rules. Add one to restrict sources, or leave empty for defaults.
          </p>
        ) : (
          <div className="space-y-8">
            {ingress.map((rule, ri) => (
              <RuleShell
                key={ri}
                title="Ingress"
                ruleIndex={ri}
                disabled={disabled}
                onRemove={() => setIngress(ingress.filter((_, i) => i !== ri))}
              >
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">From (sources)</p>
                    <div className="space-y-3">
                      {(rule.from?.length ? rule.from : [emptyPeer("pod")]).map((peer, pi) => {
                        const list = rule.from?.length ? rule.from : [emptyPeer("pod")];
                        const setPeerAt = (p: KubernetesNetworkPolicyPeer) => {
                          const next = [...list];
                          next[pi] = p;
                          updateIngressRule(ri, { ...rule, from: next });
                        };
                        const removePeer = () => {
                          const next = list.filter((_, i) => i !== pi);
                          updateIngressRule(ri, { ...rule, from: next.length ? next : [emptyPeer("pod")] });
                        };
                        return (
                          <div key={pi} className="flex gap-2">
                            <div className="min-w-0 flex-1">
                              <PeerFields peer={peer} disabled={disabled} onPeerChange={setPeerAt} />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="mt-6 h-9 shrink-0 text-muted-foreground hover:text-destructive"
                              disabled={disabled || list.length <= 1}
                              onClick={removePeer}
                              aria-label="Remove peer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={disabled}
                        onClick={() =>
                          updateIngressRule(ri, {
                            ...rule,
                            from: [...(rule.from?.length ? rule.from : [emptyPeer("pod")]), emptyPeer("pod")],
                          })
                        }
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add source
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Ports</p>
                    <PortsEditor
                      ports={rule.ports ?? []}
                      disabled={disabled}
                      onPortsChange={(ports) => updateIngressRule(ri, { ...rule, ports })}
                    />
                  </div>
                </div>
              </RuleShell>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-2">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Egress</h3>
            <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-muted-foreground">
              Where the sandbox pod may connect. Optional; omit unless you need explicit egress rules.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0 shadow-sm"
            disabled={disabled}
            onClick={() => setEgress([...egress, { to: [emptyPeer("pod")], ports: [] }])}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add egress rule
          </Button>
        </div>

        {egress.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/80 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground">
            No egress rules defined.
          </p>
        ) : (
          <div className="space-y-8">
            {egress.map((rule, ri) => (
              <RuleShell
                key={ri}
                title="Egress"
                ruleIndex={ri}
                disabled={disabled}
                onRemove={() => setEgress(egress.filter((_, i) => i !== ri))}
              >
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">To (destinations)</p>
                    <div className="space-y-3">
                      {(rule.to?.length ? rule.to : [emptyPeer("pod")]).map((peer, pi) => {
                        const list = rule.to?.length ? rule.to : [emptyPeer("pod")];
                        const setPeerAt = (p: KubernetesNetworkPolicyPeer) => {
                          const next = [...list];
                          next[pi] = p;
                          updateEgressRule(ri, { ...rule, to: next });
                        };
                        const removePeer = () => {
                          const next = list.filter((_, i) => i !== pi);
                          updateEgressRule(ri, { ...rule, to: next.length ? next : [emptyPeer("pod")] });
                        };
                        return (
                          <div key={pi} className="flex gap-2">
                            <div className="min-w-0 flex-1">
                              <PeerFields peer={peer} disabled={disabled} onPeerChange={setPeerAt} />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="mt-6 h-9 shrink-0 text-muted-foreground hover:text-destructive"
                              disabled={disabled || list.length <= 1}
                              onClick={removePeer}
                              aria-label="Remove peer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={disabled}
                        onClick={() =>
                          updateEgressRule(ri, {
                            ...rule,
                            to: [...(rule.to?.length ? rule.to : [emptyPeer("pod")]), emptyPeer("pod")],
                          })
                        }
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add destination
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Ports</p>
                    <PortsEditor
                      ports={rule.ports ?? []}
                      disabled={disabled}
                      onPortsChange={(ports) => updateEgressRule(ri, { ...rule, ports })}
                    />
                  </div>
                </div>
              </RuleShell>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
