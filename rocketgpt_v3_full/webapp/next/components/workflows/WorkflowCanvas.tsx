"use client";

import { WorkflowNode } from "@/lib/workflow-types";

import StepCard from "@/components/workflows/StepCard";

type WorkflowCanvasProps = {
  nodes: WorkflowNode[];
  onDropPaletteCat: (catId: string) => void;
  onMove: (nodeId: string, direction: -1 | 1) => void;
  onDelete: (nodeId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
};

export default function WorkflowCanvas({ nodes, onDropPaletteCat, onMove, onDelete, onReorder }: WorkflowCanvasProps) {
  return (
    <section
      className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const droppedCatId = event.dataTransfer.getData("text/plain");
        if (droppedCatId) {
          onDropPaletteCat(droppedCatId);
        }
      }}
      aria-label="Workflow canvas"
    >
      <h2 className="text-lg font-semibold">Workflow Canvas</h2>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">Drop CAT cards here. Order represents the execution path.</p>

      <div className="mt-3 space-y-2">
        {nodes.length === 0 ? (
          <div className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-neutral-700 dark:text-gray-300">
            Empty workflow. Drag a CAT from the palette or click Add.
          </div>
        ) : (
          nodes.map((node, index) => (
            <StepCard
              key={node.node_id}
              node={node}
              index={index}
              total={nodes.length}
              onMove={onMove}
              onDelete={onDelete}
              onDropAt={onReorder}
            />
          ))
        )}
      </div>
    </section>
  );
}
