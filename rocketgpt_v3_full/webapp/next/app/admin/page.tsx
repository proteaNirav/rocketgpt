import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <Link href="/admin/cats" className="rounded-md border p-4 hover:bg-muted/40">
          <h2 className="font-medium">CATS Registry</h2>
          <p className="text-sm text-muted-foreground">Manage CAT lifecycle and versions.</p>
        </Link>
        <Link href="/admin/learning" className="rounded-md border p-4 hover:bg-muted/40">
          <h2 className="font-medium">Learning Inbox</h2>
          <p className="text-sm text-muted-foreground">Review, approve, publish, and revoke learning items.</p>
        </Link>
      </div>
    </div>
  );
}
