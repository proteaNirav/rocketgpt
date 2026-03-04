export default function CatsGeneratePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Create a CAT (Generator)</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Demo UI skeleton. Next: guided wizard (metadata → policy → side effects → entrypoint → bundle digest).
      </p>

      <div style={{ marginTop: 16, display: "grid", gap: 12, maxWidth: 920 }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <strong>Step 1</strong>: Publisher Namespace + Canonical Name
        </div>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <strong>Step 2</strong>: Definition (runtime_mode, tags, allowed_side_effects, requires_approval)
        </div>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <strong>Step 3</strong>: Passport / Police requirements (passport_required, issuer, expiry)
        </div>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <strong>Step 4</strong>: Save bundle (definition JSON + digest)
        </div>
      </div>
    </main>
  );
}
