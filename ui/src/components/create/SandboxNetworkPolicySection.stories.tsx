import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { SandboxNetworkPolicySection } from "./SandboxNetworkPolicySection";
import type { SandboxNetworkPolicyManagement, SandboxNetworkPolicySpec } from "@/types";

const samplePolicy: SandboxNetworkPolicySpec = {
  ingress: [
    {
      from: [{ podSelector: { matchLabels: { app: "router" } } }],
      ports: [{ protocol: "TCP", port: 8080 }],
    },
  ],
};

function StatefulHost({
  initialManagement = "Unmanaged",
  initialPolicy = {},
  error,
  disabled,
}: {
  initialManagement?: SandboxNetworkPolicyManagement;
  initialPolicy?: SandboxNetworkPolicySpec;
  error?: string;
  disabled?: boolean;
}) {
  const [networkPolicyManagement, setNetworkPolicyManagement] =
    useState<SandboxNetworkPolicyManagement>(initialManagement);
  const [networkPolicy, setNetworkPolicy] = useState<SandboxNetworkPolicySpec>(initialPolicy);

  return (
    <div className="w-full max-w-3xl rounded-lg border border-border bg-background p-6">
      <SandboxNetworkPolicySection
        networkPolicyManagement={networkPolicyManagement}
        onNetworkPolicyManagementChange={setNetworkPolicyManagement}
        networkPolicy={networkPolicy}
        onNetworkPolicyChange={setNetworkPolicy}
        error={error}
        disabled={disabled}
      />
    </div>
  );
}

const meta = {
  title: "Create/SandboxNetworkPolicySection",
  component: SandboxNetworkPolicySection,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof SandboxNetworkPolicySection>;

export default meta;
type Story = StoryObj<typeof meta>;

function interactiveArgs(
  overrides: Partial<{
    networkPolicyManagement: SandboxNetworkPolicyManagement;
    networkPolicy: SandboxNetworkPolicySpec;
    error: string | undefined;
    disabled: boolean | undefined;
  }> = {},
): Story["args"] {
  return {
    networkPolicyManagement: "Unmanaged",
    onNetworkPolicyManagementChange: fn(),
    networkPolicy: {},
    onNetworkPolicyChange: fn(),
    ...overrides,
  };
}

export const Unmanaged: Story = {
  args: interactiveArgs(),
  render: () => <StatefulHost />,
};

export const ManagedWithRules: Story = {
  args: interactiveArgs({
    networkPolicyManagement: "Managed",
    networkPolicy: samplePolicy,
  }),
  render: () => <StatefulHost initialManagement="Managed" initialPolicy={samplePolicy} />,
};

export const ManagedEmpty: Story = {
  args: interactiveArgs({
    networkPolicyManagement: "Managed",
    networkPolicy: {},
  }),
  render: () => <StatefulHost initialManagement="Managed" initialPolicy={{}} />,
  name: "Managed (no custom rules)",
};

export const ValidationError: Story = {
  args: interactiveArgs({
    networkPolicyManagement: "Managed",
    networkPolicy: samplePolicy,
    error: "Ingress rule 1: peer 1 has invalid CIDR (expected IPv4 like 10.0.0.0/8)",
  }),
  render: () => (
    <StatefulHost initialManagement="Managed" initialPolicy={samplePolicy} error="Ingress rule 1: invalid CIDR" />
  ),
};

export const Disabled: Story = {
  args: interactiveArgs({
    networkPolicyManagement: "Managed",
    networkPolicy: samplePolicy,
    disabled: true,
  }),
  render: () => (
    <StatefulHost initialManagement="Managed" initialPolicy={samplePolicy} disabled />
  ),
};
