'use client'

export default function ErrorState({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-semibold text-red-600">Status failed to load</h1>
      <pre className="mt-2 text-sm bg-red-50 p-3 rounded">{error.message}</pre>
    </div>
  );
}
