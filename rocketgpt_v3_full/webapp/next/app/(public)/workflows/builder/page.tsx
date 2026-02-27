import WorkflowBuilder from "@/components/workflows/WorkflowBuilder";

export default function WorkflowsBuilderPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Workflow Builder</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Compose multi-CAT workflows, validate compatibility, and generate replay simulation artifacts.
      </p>
      <WorkflowBuilder />
    </div>
  );
}
