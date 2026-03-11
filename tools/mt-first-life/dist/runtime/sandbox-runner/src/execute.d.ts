import type { BoundedExecutionRequest, ExecutionResultEnvelope } from "./types.js";
export interface BoundedDocumentWriteInput {
    request: BoundedExecutionRequest;
    outputPath: string;
    content: string;
}
export declare function executeBoundedDocumentWrite(input: BoundedDocumentWriteInput): Promise<ExecutionResultEnvelope>;
