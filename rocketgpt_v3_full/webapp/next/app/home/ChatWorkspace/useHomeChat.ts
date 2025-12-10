"use client";

import { useState } from "react";

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
}

const INITIAL_MESSAGES: HomeChatMessage[] = [
  {
    id: "m1",
    role: "user",
    name: "Nirav",
    time: "09:32",
    content:
      "Help me set up a clean Home Chat workspace UI for RocketGPT with collapsible side panels.",
  },
  {
    id: "m2",
    role: "assistant",
    name: "RocketGPT",
    time: "09:32",
    content:
      "Understood. We will start with a 3-pane layout: Sessions on the left, Chat workspace in the center, and Inspector on the right, all full-height and collapsible.",
  },
  {
    id: "m3",
    role: "assistant",
    name: "RocketGPT",
    time: "09:35",
    content:
      "The basic skeleton is now in place. Next we can refine the sessions list, workspace header, and inspector cards while keeping everything aligned with the dark theme.",
  },
  {
    id: "m4",
    role: "user",
    name: "Nirav",
    time: "09:36",
    content:
      "Looks good. Continue to refine the UI, we will wire the real APIs later.",
  },
];

/**
 * useHomeChat
 * -----------
 * Manages the Home Chat transcript and wires the composer
 * to the demo chat API at /api/demo/chat.
 */
export function useHomeChat(): UseHomeChatResult {
  const [messages, setMessages] = useState<HomeChatMessage[]>(INITIAL_MESSAGES);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed || sending) {
      return;
    }

    const now = new Date();
    const time = now.toTimeString().slice(0, 5); // "HH:MM"

    const userMessage: HomeChatMessage = {
      id: "user-" + Date.now().toString(),
      role: "user",
      name: "Nirav",
      content: trimmed,
      time,
    };

    // Optimistically add user message
    setMessages((prev) => [...prev, userMessage]);
    setSending(true);
    setError(null);

    try {
      const payload = {
        messages: [
          {
            role: "user",
            content: trimmed,
          },
        ],
      };

      const res = await fetch("/api/demo/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMsg = "Request failed (" + res.status.toString() + ")";
        try {
          const data = (await res.json()) as any;
          if (data && typeof data.error === "string") {
            errMsg = data.error;
          }
        } catch {
          // ignore JSON parse error
        }

        setError(errMsg);

        const errorMessage: HomeChatMessage = {
          id: "err-" + Date.now().toString(),
          role: "assistant",
          name: "RocketGPT",
          content: "⚠️ Error from demo chat API: " + errMsg,
          time,
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      const data = (await res.json()) as any;
      let replyText = "RocketGPT demo orchestrator could not generate a reply.";
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
    } catch (e: any) {
      const msg =
        e && typeof e.message === "string"
          ? e.message
          : "Network error while calling demo chat API.";
      setError(msg);

      const errorMessage: HomeChatMessage = {
        id: "err-" + Date.now().toString(),
        role: "assistant",
        name: "RocketGPT",
        content: "⚠️ Network error while calling demo chat API: " + msg,
        time,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  return {
    messages,
    sending,
    error,
    sendMessage,
  };
}
