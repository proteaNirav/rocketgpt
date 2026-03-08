"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DECISION_CATEGORIES = exports.REASONING_CONTEXT_TYPES = exports.WORKING_MEMORY_KEYS = void 0;
exports.WORKING_MEMORY_KEYS = {
    LAST_ROUTE_TYPE: "runtime.last_route_type",
    LAST_ROUTE_DISPOSITION: "runtime.last_route_disposition",
    LAST_SYNC_PLAN_ID: "runtime.last_sync_plan_id",
    LAST_EXPERIENCE_ID: "runtime.last_experience_id",
    LAST_EXPERIENCE_OUTCOME: "runtime.last_experience_outcome",
    LAST_EXPERIENCE_CAPTURE_STATUS: "runtime.last_experience_capture_status",
    LAST_EXPERIENCE_CAPTURE_ERROR: "runtime.last_experience_capture_error",
    LAST_MEMORY_INJECTION_STATUS: "runtime.last_memory_injection_status",
    LAST_MEMORY_PACKET_ID: "runtime.last_memory_packet_id",
    LAST_MEMORY_SELECTION_REASON: "runtime.last_memory_selection_reason",
    LAST_MEMORY_REUSE_HINT: "runtime.last_memory_reuse_hint",
    LAST_MEMORY_ADOPTION_STATUS: "runtime.last_memory_adoption_status",
    LAST_MEMORY_ADOPTION_QUALITY: "runtime.last_memory_adoption_quality",
    LAST_MEMORY_ADOPTION_REASON_CODES: "runtime.last_memory_adoption_reason_codes",
    LAST_MEMORY_ADOPTED_RECORD_ID: "runtime.last_memory_adopted_record_id",
    LAST_MEMORY_REINFORCEMENT_COUNT: "runtime.last_memory_reinforcement_count",
    LAST_MOTIVATED_RECALL_MODE: "runtime.last_motivated_recall_mode",
    LAST_MOTIVATED_RECALL_SCORE: "runtime.last_motivated_recall_score",
};
exports.REASONING_CONTEXT_TYPES = {
    INPUT_RECEIVED: "runtime.input_received",
    ROUTE_EXECUTION_STARTED: "runtime.route_execution_started",
    ROUTE_EXECUTION_COMPLETED: "runtime.route_execution_completed",
    ROUTE_EXECUTION_FAILED: "runtime.route_execution_failed",
    CAPABILITY_INVOKED: "runtime.capability_invoked",
    CAPABILITY_VERIFICATION: "runtime.capability_verification",
    MEMORY_INJECTION: "runtime.memory_injection",
    MOTIVATED_RECALL: "runtime.motivated_recall",
    EXPERIENCE_CAPTURED: "runtime.experience_captured",
};
exports.DECISION_CATEGORIES = {
    ROUTE_SELECTION: "runtime.route_selection",
    ROUTE_OUTCOME: "runtime.route_outcome",
    ROUTE_ERROR: "runtime.route_error",
    CAPABILITY_SELECTION: "runtime.capability_selection",
    MOTIVATED_RECALL: "runtime.motivated_recall",
    MEMORY_SELECTION: "runtime.memory_selection",
    CAPABILITY_OUTCOME: "runtime.capability_outcome",
    CAPABILITY_VERDICT: "runtime.capability_verdict",
    EXPERIENCE_CAPTURE: "runtime.experience_capture",
};
