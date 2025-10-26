"use client";

import { useState } from "react";
import { passManualReview } from "@/services/selfApply";

export function ManualReviewButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await passManualReview(jobId);
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
        className={`rounded px-3 py-2 text-white text-sm font-medium ${
          done ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Marking..." : done ? "Passed ✅" : "Pass Manual Review"}
      </button>
      {error && <span className="text-red-500 text-xs">{error}</span>}
    </div>
  );
}
