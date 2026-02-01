"use client";

// Re-export from context for backward compatibility
export {
  useHomeChat,
  HomeChatProvider,
  type HomeChatMessage,
  type HomeChatRole,
} from "./HomeChatContext";

export type { UseHomeChatResult } from "./HomeChatContext";
