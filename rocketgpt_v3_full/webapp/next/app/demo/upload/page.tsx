"use client";

import React, { useState, FormEvent, ChangeEvent } from "react";

export default function DemoUploadPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFiles(e.target.files);
    setStatus(null);
    setError(null);
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError("Please choose at least one file.");
      return;
    }

    setUploading(true);
    setStatus(null);
    setError(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file) {
          formData.append("file", file);
        }
      }

      const res = await fetch("/api/demo/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setStatus(
        `Received ${data.receivedFiles ?? 0} file(s). (Demo endpoint – files not persisted.)`
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-start p-4 gap-4">
      <div className="w-full max-w-3xl border rounded-xl p-4 shadow-sm bg-white/80 dark:bg-neutral-900/80">
        <h1 className="text-2xl font-semibold mb-2">
          RocketGPT Demo Upload & Ingestion
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          This page demonstrates the file upload pipeline via
          <code className="ml-1 px-1 rounded bg-gray-100 dark:bg-neutral-800">
            /api/demo/upload
          </code>
          . The backend currently only counts files and returns a JSON
          response. Later, you can wire this to your real ingestion/orchestration
          flow (e.g. saving to Supabase, knowledge library, or test automation
          pipelines).
        </p>

        <form onSubmit={handleUpload} className="flex flex-col gap-3">
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="text-sm"
          />
          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 rounded-lg text-sm font-medium border bg-blue-600 text-white disabled:opacity-60 self-start"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>

        {status && (
          <div className="mt-2 text-xs text-green-600 dark:text-green-400">
            {status}
          </div>
        )}
        {error && (
          <div className="mt-2 text-xs text-red-500">
            Error talking to /api/demo/upload: {error}
          </div>
        )}
      </div>
    </div>
  );
}

