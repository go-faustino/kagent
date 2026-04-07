"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import type { SandboxNetworkPolicyManagement, SandboxNetworkPolicySpec } from "@/types";
import { NetworkPolicyRulesEditor } from "./NetworkPolicyRulesEditor";

export interface SandboxNetworkPolicySectionProps {
  networkPolicyManagement: SandboxNetworkPolicyManagement;
  onNetworkPolicyManagementChange: (v: SandboxNetworkPolicyManagement) => void;
  networkPolicy: SandboxNetworkPolicySpec;
  onNetworkPolicyChange: (v: SandboxNetworkPolicySpec) => void;
  error?: string;
  disabled?: boolean;
}

export function SandboxNetworkPolicySection({
  networkPolicyManagement,
  onNetworkPolicyManagementChange,
  networkPolicy,
  onNetworkPolicyChange,
  error,
  disabled,
}: SandboxNetworkPolicySectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold">Sandbox network policy</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Controls how agent-sandbox manages NetworkPolicies for this workload.{" "}
          <span className="font-medium">Unmanaged</span> is recommended so kagent can reach the agent Service in-cluster.
          Use <span className="font-medium">Managed</span> with custom rules if you use a router or need tight isolation.
        </p>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Network policy management</Label>
        <Select
          value={networkPolicyManagement}
          onValueChange={(v) => onNetworkPolicyManagementChange(v as SandboxNetworkPolicyManagement)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Unmanaged">Unmanaged (default)</SelectItem>
            <SelectItem value="Managed">Managed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {networkPolicyManagement === "Managed" && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs leading-relaxed">
              Optional rules for <span className="font-medium">spec.sandbox.networkPolicy</span> (Kubernetes{" "}
              <span className="font-medium">networking.k8s.io/v1</span> ingress/egress). Editor covers label selectors
              and IP blocks; <span className="font-medium">matchExpressions</span> from YAML are not edited here. Leave
              rules empty to use the controller&apos;s default policy.
            </AlertDescription>
          </Alert>

          <div className="rounded-xl border border-border/80 bg-muted/15 p-5 shadow-sm">
            <NetworkPolicyRulesEditor value={networkPolicy} onChange={onNetworkPolicyChange} disabled={disabled} />
            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          </div>
        </>
      )}
    </div>
  );
}
