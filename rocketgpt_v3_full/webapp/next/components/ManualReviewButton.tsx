"use client";

import { useState } from "react";
import { completeManualReviewAndApply } from "./selfApply";

export function ManualReviewButton({
  jobId,
  proposalId,
}: {
  jobId: string;
  proposalId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await completeManualReviewAndApply(jobId, proposalId);
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={loading || done}
        className={`rounded px-3 py-1.5 text-white text-sm font-medium ${
          done ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
        }`}
        title="Marks manual review as passed and triggers final apply"
      >
        {loading ? "Processingâ€¦" : done ? "Applied âœ…" : "Pass Manual Review"}
      </button>
      {error && <span className="text-red-500 text-xs">{error}</span>}
    </div>
  );
}


