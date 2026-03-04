export default function CatsLibraryPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>CATS Library</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Demo UI skeleton. Next: wire to read-only registry endpoints and show available CATS.
      </p>
      <div style={{ marginTop: 16 }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <strong>Placeholder</strong>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            Table: canonical_name, cat_id, status, passport_required, expires_at, tags, actions.
          </div>
        </div>
      </div>
    </main>
  );
}
