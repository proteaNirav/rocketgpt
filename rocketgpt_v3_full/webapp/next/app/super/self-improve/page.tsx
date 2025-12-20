import StatusCard from "@/app/components/StatusCard";

type Item = {
  title: string;
  status: "Planned" | "Coded" | "Built" | "Deployed" | "Verified";
  note?: string;
};

async function loadItems(): Promise<Item[]> {
  // Placeholder: wire to Supabase or logs later
  return [
    { title: "UI fixes bundle A", status: "Deployed", note: "Merged via go-live/p1p2-bundle" },
    { title: "Home dashboard binding", status: "Coded" },
    { title: "Smoke page", status: "Built" },
    { title: "Self-Improve visibility", status: "Planned" }
  ];
}

export default async function Page() {
  const items = await loadItems();
  const phases: Item["status"][] = ["Planned","Coded","Built","Deployed","Verified"];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Self-Improve · Status</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {phases.map(p => (
          <StatusCard key={p} title={p} value={items.filter(i => i.status === p).length} />
        ))}
      </div>

      <div className="space-y-3">
        {items.map((i, idx) => (
          <div key={idx} className="border border-gray-200 rounded-2xl p-4">
            <div className="text-sm text-gray-500">{i.status}</div>
            <div className="text-base font-semibold">{i.title}</div>
            {i.note ? <div className="text-xs text-gray-400 mt-1">{i.note}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
