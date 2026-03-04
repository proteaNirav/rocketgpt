"use client";

import { WorkflowNode } from "@/lib/workflow-types";

type StepCardProps = {
  node: WorkflowNode;
  index: number;
  total: number;
  onMove: (nodeId: string, direction: -1 | 1) => void;
  onDelete: (nodeId: string) => void;
  onDropAt: (fromIndex: number, toIndex: number) => void;
};

export default function StepCard({ node, index, total, onMove, onDelete, onDropAt }: StepCardProps) {
  return (
    <article
      className="rounded border border-gray-200 p-3 dark:border-neutral-700"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-rgpt-step-index", String(index));
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const raw = event.dataTransfer.getData("application/x-rgpt-step-index");
        const fromIndex = Number(raw);
        if (!Number.isNaN(fromIndex)) {
          onDropAt(fromIndex, index);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{index + 1}. {node.name}</p>
          <p className="font-mono text-xs text-gray-600 dark:text-gray-300">{node.cat_id}</p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{node.expected_behavior}</p>
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onMove(node.node_id, -1)}
            disabled={index === 0}
            className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-neutral-700"
            aria-label={`Move ${node.name} up`}
          >
            Up
          </button>
          <button
            type="button"
            onClick={() => onMove(node.node_id, 1)}
            disabled={index === total - 1}
            className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-neutral-700"
            aria-label={`Move ${node.name} down`}
          >
            Down
          </button>
          <button
            type="button"
            onClick={() => onDelete(node.node_id)}
            className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 dark:border-red-900 dark:text-red-300"
            aria-label={`Delete ${node.name}`}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
