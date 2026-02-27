import { redirect } from "next/navigation";

import { isDemoMode } from "@/lib/demo-mode";

export default function WorkflowsCatchAllPage() {
  if (isDemoMode()) {
    redirect("/workflows/builder");
  }

  redirect("/workflows/builder");
}
