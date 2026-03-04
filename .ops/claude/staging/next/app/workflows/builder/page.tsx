export default function WorkflowBuilderPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Workflow Builder (Multi-CAT)</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Demo UI skeleton. Next: drag-drop graph where nodes are CATS and edges are data flow / governance checks.
      </p>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "320px 1fr", gap: 12 }}>
        <aside style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, minHeight: 420 }}>
          <strong>CAT Palette</strong>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            List from registry. Drag into canvas.
          </div>
        </aside>

        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, minHeight: 420 }}>
          <strong>Canvas</strong>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            Nodes: CATs. Edges: inputs/outputs. Validate side-effects + passport constraints.
          </div>
        </section>
      </div>
    </main>
  );
}
