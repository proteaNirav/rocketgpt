"use client";
import React from "react";

type Props = {
  title: string;
  value?: string | number | React.ReactNode;
  hint?: string;
  bad?: boolean;
};
export default function StatusCard({ title, value, hint, bad }: Props) {
  return (
    <div className={`rounded-2xl p-4 shadow ${bad ? "border border-red-300" : "border border-gray-200"}`}>
      <div className="text-sm text-gray-500">{title}</div>
      <div className={`text-xl font-semibold mt-1 ${bad ? "text-red-600" : "text-gray-900"}`}>{value ?? "—"}</div>
      {hint ? <div className="text-xs text-gray-400 mt-1">{hint}</div> : null}
    </div>
  );
}
