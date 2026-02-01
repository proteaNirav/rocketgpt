"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type HomeChatRole = "user" | "assistant";

export interface HomeChatMessage {
  id: string;
  role: HomeChatRole;
  name: string;
  content: string;
  time: string;
}

export interface UseHomeChatResult {
  messages: HomeChatMessage[];
  sending: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  resetChat: () => void;
  /** Increments on resetChat(); use as key to hard-reset child components */
  resetKey: number;
}

type HomeChatContextValue = UseHomeChatResult;

const HomeChatContext = createContext<HomeChatContextValue | null>(null);

/**
 * HomeChatProvider
 * Provides shared chat state across the Home workspace.
 * Phase-1: Messages start empty (no demo seeding).
 */
export function HomeChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<HomeChatMessage[]>([]);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState<number>(0);

  const sendMessage = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed || sending) {
      return;
    }

    const now = new Date();
    const time = now.toTimeString().slice(0, 5);

    const userMessage: HomeChatMessage = {
      id: "user-" + Date.now().toString(),
      role: "user",
      name: "You",
      content: trimmed,
      time,
    };

    setMessages((prev) => [...prev, userMessage]);
    setSending(true);
    setError(null);

    try {
      const payload = {
        messages: [{ role: "user", content: trimmed }],
      };

      const res = await fetch("/api/demo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMsg = "Request failed (" + res.status.toString() + ")";
        try {
          const data = await res.json();
          if (data && typeof data.error === "string") {
            errMsg = data.error;
          }
        } catch {
          // ignore
        }

        setError(errMsg);
        const errorMessage: HomeChatMessage = {
          id: "err-" + Date.now().toString(),
          role: "assistant",
          name: "RocketGPT",
          content: "Error: " + errMsg,
          time,
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      const data = await res.json();
      let replyText = "RocketGPT could not generate a reply.";
      if (data && typeof data.reply === "string") {
        replyText = data.reply;
      }

      const assistantMessage: HomeChatMessage = {
        id: "assistant-" + Date.now().toString(),
        role: "assistant",
        name: "RocketGPT",
        content: replyText,
        time,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      setError(msg);

      const errorMessage: HomeChatMessage = {
        id: "err-" + Date.now().toString(),
        role: "assistant",
        name: "RocketGPT",
        content: "Network error: " + msg,
        time,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const clearMessages = (): void => {
    setMessages([]);
    setError(null);
  };

  /**
   * resetChat - Full reset for New Chat button
   * Clears messages, error, sending state, and increments resetKey
   * so child components (like composer input) can hard-reset.
   */
  const resetChat = (): void => {
    setMessages([]);
    setError(null);
    setSending(false);
    setResetKey((k) => k + 1);
  };

  return (
    <HomeChatContext.Provider
      value={{ messages, sending, error, sendMessage, clearMessages, resetChat, resetKey }}
    >
      {children}
    </HomeChatContext.Provider>
  );
}

/**
 * useHomeChat - Access shared chat state
 */
export function useHomeChat(): HomeChatContextValue {
  const ctx = useContext(HomeChatContext);
  if (!ctx) {
    throw new Error("useHomeChat must be used within HomeChatProvider");
  }
  return ctx;
}
