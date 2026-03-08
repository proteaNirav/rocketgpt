"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import {
  createLearningSource,
  listLearningSources,
  runLearningSource,
  updateLearningSource,
  type LearningSourceDto,
} from "@/lib/admin-learning-api";

export default function AdminLearningSourcesPage() {
  const [items, setItems] = useState<LearningSourceDto[]>([]);
  const [name, setName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState("360");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await listLearningSources());
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setError(null);
    try {
      await createLearningSource({
        kind: "rss",
        name: name.trim(),
        sourceUrl: sourceUrl.trim(),
        intervalMinutes: Number(intervalMinutes || "360"),
        enabled: true,
      });
      setName("");
      setSourceUrl("");
      setIntervalMinutes("360");
      await load();
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  }

  async function toggleEnabled(source: LearningSourceDto) {
    setError(null);
    try {
      await updateLearningSource(source.id, { enabled: !source.enabled });
      await load();
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  }

  async function runNow(source: LearningSourceDto) {
    setError(null);
    try {
      await runLearningSource(source.id);
      await load();
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Learning Sources</h1>
        <Link href="/admin/learning" className="text-sm text-blue-600 hover:underline">
          Back to inbox
        </Link>
      </div>

      {error ? <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <section className="space-y-2 rounded-md border p-4">
        <h2 className="font-medium">Add RSS Source</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="RSS URL" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
          <Input placeholder="Interval minutes" value={intervalMinutes} onChange={(e) => setIntervalMinutes(e.target.value)} />
        </div>
        <Button onClick={() => void create()} disabled={!name.trim() || !sourceUrl.trim()}>
          Add Source
        </Button>
      </section>

      <section className="space-y-2 rounded-md border p-4">
        <h2 className="font-medium">Configured Sources</h2>
        {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
        <div className="space-y-2">
          {items.map((source) => (
            <div key={source.id} className="rounded-md border p-3">
              <p className="font-medium">{source.name}</p>
              <p className="text-xs text-muted-foreground">
                {source.kind} · {source.sourceUrl || "-"} · every {source.intervalMinutes}m · enabled=
                {String(source.enabled)}
              </p>
              <p className="text-xs text-muted-foreground">
                last run: {source.lastRunAt ? new Date(source.lastRunAt).toLocaleString() : "never"}
              </p>
              {source.lastError ? <p className="text-xs text-red-700">last error: {source.lastError}</p> : null}
              <div className="mt-2 flex gap-2">
                <Button variant="outline" onClick={() => void toggleEnabled(source)}>
                  {source.enabled ? "Disable" : "Enable"}
                </Button>
                <Button onClick={() => void runNow(source)} disabled={!source.enabled || source.kind !== "rss"}>
                  Run Now
                </Button>
              </div>
            </div>
          ))}
          {!loading && items.length === 0 ? (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">No learning sources configured.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
