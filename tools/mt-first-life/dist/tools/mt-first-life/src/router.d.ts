import type { BuilderAssignmentEnvelope } from "../../../shared/event-model/types.js";
import type { BuildersState, PersistedBuilderRecord, PersistedTaskRecord } from "./types.js";
export declare function routeTask(buildersState: BuildersState, task: PersistedTaskRecord): {
    builder: PersistedBuilderRecord;
    assignment: BuilderAssignmentEnvelope;
};
