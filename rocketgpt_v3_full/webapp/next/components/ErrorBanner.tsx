"use client";

export default function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="w-full bg-red-600 text-white p-3 rounded-md mb-4 shadow">
      <p className="font-semibold">⚠ Error</p>
      <p className="text-sm mt-1">{message}</p>
    </div>
  );
}
