import CreateCatWizard from "@/components/cats/CreateCatWizard";

export default function CatsCreatePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Create CAT</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300">Build and save a demo CAT to localStorage-backed dynamic catalog.</p>
      <CreateCatWizard />
    </div>
  );
}
