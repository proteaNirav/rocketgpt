export default function StatusPage() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">RocketGPT • System Status</h1>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h2 className="font-medium">API</h2>
          <p>OK</p>
        </div>
        <div className="rounded-xl border p-4">
          <h2 className="font-medium">Web App</h2>
          <p>OK</p>
        </div>
        <div className="rounded-xl border p-4">
          <h2 className="font-medium">Supabase</h2>
          <p>OK</p>
        </div>
        <div className="rounded-xl border p-4">
          <h2 className="font-medium">Jobs</h2>
          <p>Idle</p>
        </div>
      </section>
      <p className="text-sm text-gray-500">Static placeholder page—wire to live checks later.</p>
    </main>
  );
}
