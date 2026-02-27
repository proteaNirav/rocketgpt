import CatsGeneratorWizard from "@/components/cats/CatsGeneratorWizard";

export default function CatsGeneratePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">CATS Generator</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Wizard for creating governance-friendly CAT definition JSON with bundle digest.
      </p>
      <CatsGeneratorWizard />
    </div>
  );
}
