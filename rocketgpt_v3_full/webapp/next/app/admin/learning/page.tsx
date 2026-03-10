"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/button";
import { listLearningItems, type LearningItemDto, reviewLearningItem } from "@/lib/admin-learning-api";

type Filter = "all" | "proposed" | "approved" | "published" | "rejected" | "revoked" | "deprecated";

export default function AdminLearningInboxPage() {
  const [items, setItems] = useState<LearningItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("proposed");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await listLearningItems(filter === "all" ? undefined : filter);
      setItems(next);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function quickDecision(itemId: string, decision: "approve" | "reject") {
    setError(null);
    try {
      await reviewLearningItem(itemId, decision);
      await load();
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  }

  const grouped = useMemo(() => items, [items]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Learning Inbox</h1>
        <div className="flex gap-2">
          <Link href="/admin/learning/sources">
            <Button variant="outline">Manage Sources</Button>
          </Link>
          <Button onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "proposed", "approved", "published", "rejected", "revoked", "deprecated"] as Filter[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded border px-2 py-1 text-xs ${filter === value ? "bg-muted" : ""}`}
          >
            {value}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

      <div className="space-y-3">
        {grouped.map((item) => (
          <div key={item.id} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link href={`/admin/learning/${item.id}`} className="font-medium text-blue-600 hover:underline">
                  {item.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {item.status} · {item.sourceKind} · {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              {item.status === "proposed" ? (
                <div className="flex gap-2">
                  <Button onClick={() => void quickDecision(item.id, "approve")}>Approve</Button>
                  <Button variant="outline" onClick={() => void quickDecision(item.id, "reject")}>
                    Reject
                  </Button>
                </div>
              ) : null}
            </div>
            <p className="mt-2 line-clamp-3 text-sm">{item.sanitizedContent}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Topics: {item.topics.length > 0 ? item.topics.join(", ") : "none"}
            </p>
            {item.libraryPath ? <p className="text-xs text-muted-foreground">Published path: {item.libraryPath}</p> : null}
          </div>
        ))}
        {!loading && grouped.length === 0 ? (
          <div className="rounded-md border p-4 text-sm text-muted-foreground">No learning items found.</div>
        ) : null}
      </div>
    </div>
  );
}
