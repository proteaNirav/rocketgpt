import CatsApprovalsInbox from "@/components/cats/CatsApprovalsInbox";
import { isDemoMode } from "@/lib/demo-mode";

export default function CatsApprovalsPage() {
  return <CatsApprovalsInbox demoMode={isDemoMode()} />;
}
