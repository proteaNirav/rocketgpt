"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import {
  getLearningItem,
  publishLearningItem,
  reviewLearningItem,
  type LearningItemDto,
} from "@/lib/admin-learning-api";

export default function AdminLearningDetailPage() {
  const params = useParams<{ itemId: string }>();
  const [item, setItem] = useState<LearningItemDto | null>(null);
  const [libraryId, setLibraryId] = useState("global");
  const [rationale, setRationale] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load(targetItemId: string) {
    setLoading(true);
    setError(null);
    try {
      setItem(await getLearningItem(targetItemId));
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const itemId = String(params.itemId || "");
    if (!itemId) return;
    void load(itemId);
  }, [params.itemId]);

  async function review(decision: "approve" | "reject" | "revoke" | "deprecate") {
    if (!item) return;
    setMessage(null);
    setError(null);
    try {
      await reviewLearningItem(item.id, decision, rationale || undefined);
      setMessage(`Decision applied: ${decision}`);
      await load(item.id);
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  }

  async function publish() {
    if (!item) return;
    setMessage(null);
    setError(null);
    try {
      const result = await publishLearningItem(item.id, libraryId.trim() || "global");
      setMessage(`Published to ${result.filePath}`);
      await load(item.id);
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Learning Review</h1>
        <Link href="/admin/learning" className="text-sm text-blue-600 hover:underline">
          Back to inbox
        </Link>
      </div>

      {error ? <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-700">{message}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

      {item ? (
        <>
          <section className="space-y-2 rounded-md border p-4">
            <h2 className="font-medium">{item.title}</h2>
            <p className="text-xs text-muted-foreground">
              status={item.status} · source={item.sourceKind} · created={new Date(item.createdAt).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">topics: {item.topics.join(", ") || "none"}</p>
            {item.libraryPath ? <p className="text-xs text-muted-foreground">published path: {item.libraryPath}</p> : null}
            <pre className="max-h-80 overflow-auto rounded bg-muted/40 p-3 text-xs">{item.sanitizedContent}</pre>
          </section>

          <section className="space-y-2 rounded-md border p-4">
            <h2 className="font-medium">Decision</h2>
            <Input value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Rationale (optional)" />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void review("approve")}>Approve</Button>
              <Button variant="outline" onClick={() => void review("reject")}>
                Reject
              </Button>
              <Button variant="outline" onClick={() => void review("deprecate")}>
                Deprecate
              </Button>
              <Button variant="outline" onClick={() => void review("revoke")}>
                Revoke
              </Button>
            </div>
          </section>

          <section className="space-y-2 rounded-md border p-4">
            <h2 className="font-medium">Publish</h2>
            <Input value={libraryId} onChange={(e) => setLibraryId(e.target.value)} placeholder="library id" />
            <Button onClick={() => void publish()}>Publish To Library</Button>
          </section>
        </>
      ) : null}
    </div>
  );
}
