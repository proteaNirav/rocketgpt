import WorkflowBuilder from "@/components/workflows/WorkflowBuilder";

export default function WorkflowsBuilderPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Workflow Builder</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Compose ordered workflows from the local seed catalog and export MVP workflow artifacts.
      </p>
      <WorkflowBuilder />
    </div>
  );
}
