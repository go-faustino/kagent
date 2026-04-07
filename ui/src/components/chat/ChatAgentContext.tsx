"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AgentType } from "@/types";

const ChatAgentContext = createContext<AgentType | undefined>(undefined);

export function ChatAgentProvider({
  agentType,
  children,
}: {
  agentType: AgentType;
  children: ReactNode;
}) {
  return (
    <ChatAgentContext.Provider value={agentType}>
      {children}
    </ChatAgentContext.Provider>
  );
}

/** Agent type for the current chat route (from layout). Undefined outside provider. */
export function useChatAgentType(): AgentType | undefined {
  return useContext(ChatAgentContext);
}
