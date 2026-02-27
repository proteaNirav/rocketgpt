import CatsLibraryTable from "@/components/cats/CatsLibraryTable";

export default function CatsLibraryPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">CATS Library</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Registry-backed catalog view for demo-safe CATS operations.
      </p>
      <CatsLibraryTable />
    </div>
  );
}
