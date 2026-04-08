package v1alpha2

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// VirtualAgentFromSandboxAgent builds an in-memory Agent used by the ADK translator and HTTP API.
// It is not persisted as an Agent resource; use the SandboxAgent CRD in etcd.
func VirtualAgentFromSandboxAgent(sa *SandboxAgent) *Agent {
	if sa == nil {
		return nil
	}
	a := &Agent{
		TypeMeta: metav1.TypeMeta{
			APIVersion: GroupVersion.String(),
			Kind:       "Agent",
		},
		ObjectMeta: sa.ObjectMeta,
		Spec: AgentSpec{
			Type: AgentType_Sandbox,
			Sandbox: &SandboxAgentSpec{
				Declarative:             sa.Spec.Declarative,
				NetworkPolicyManagement: sa.Spec.NetworkPolicyManagement,
				NetworkPolicy:           sa.Spec.NetworkPolicy,
			},
			Description:       sa.Spec.Description,
			Skills:            sa.Spec.Skills,
			AllowedNamespaces: sa.Spec.AllowedNamespaces,
		},
	}
	sa.Status.DeepCopyInto(&a.Status)
	return a
}
