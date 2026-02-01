import { redirect } from "next/navigation";

/**
 * RGPT-P1: Root page redirects to /home (chat workspace).
 *
 * Phase-1 Go-Live requires chat-first UX: opening rocketgpt.dev
 * must immediately show the chat interface, not a dashboard.
 *
 * The previous dashboard content can be restored at /dashboard
 * if needed in a future phase.
 */
export default function RootPage() {
  redirect("/home");
}
