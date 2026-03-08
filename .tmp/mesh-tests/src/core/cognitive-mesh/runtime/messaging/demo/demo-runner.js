"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cognitive_messaging_plane_runtime_1 = require("../cognitive-messaging-plane-runtime");
const sleep = async (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
function buildParcel(input) {
    const now = new Date().toISOString();
    return {
        ...input,
        createdAt: now,
        updatedAt: now,
    };
}
async function runDemo() {
    const runtime = new cognitive_messaging_plane_runtime_1.CognitiveMessagingPlaneRuntime();
    console.log("[demo] submitting parcel #1 CAT -> Librarian (NORMAL) for public bus route");
    const parcel1 = buildParcel({
        parcelId: "demo-p1",
        sessionId: "demo-session-1",
        sourceNodeId: "cat-hub",
        sourceNodeClass: "cat",
        targetNodeId: "librarian-hub",
        targetNodeClass: "librarian",
        intent: "index",
        priority: "normal",
        eventType: "knowledge.packet.created",
        payload: { topic: "runtime foundations" },
        profile: {
            sizeClass: "small",
            sensitivity: "internal",
            replayable: true,
            requiresChainOfCustody: false,
        },
    });
    await runtime.submitParcel(parcel1);
    console.log("[demo] submitting parcel #2 CAT -> Learner (HIGH, CONFIDENTIAL) for secure private dispatch");
    const parcel2 = buildParcel({
        parcelId: "demo-p2",
        sessionId: "demo-session-1",
        sourceNodeId: "cat-hub",
        sourceNodeClass: "cat",
        targetNodeId: "learner-hub",
        targetNodeClass: "learner",
        intent: "coordinate",
        priority: "high",
        eventType: "knowledge.packet.sync",
        payload: { confidential: true },
        profile: {
            sizeClass: "small",
            sensitivity: "confidential",
            replayable: false,
            requiresChainOfCustody: true,
        },
    });
    await runtime.submitParcel(parcel2);
    console.log("[demo] submitting parcel #3 Governance -> Execution (EMERGENCY) for rocket dispatch");
    const parcel3 = buildParcel({
        parcelId: "demo-p3",
        sessionId: "demo-session-1",
        sourceNodeId: "governance-hub",
        sourceNodeClass: "governance",
        targetNodeId: "execution-hub",
        targetNodeClass: "execution",
        intent: "escalate",
        priority: "emergency",
        eventType: "governance.policy.override",
        payload: { ticket: "GV-911" },
        profile: {
            sizeClass: "tiny",
            sensitivity: "governance",
            replayable: false,
            requiresChainOfCustody: true,
        },
    });
    await runtime.submitParcel(parcel3);
    // Allow public routes to heartbeat and process queued parcels.
    await sleep(2600);
    const receipts = runtime.getReceipts();
    console.log("[demo] delivery receipt ledger snapshot");
    console.table(receipts.map((receipt) => ({
        receiptId: receipt.receiptId,
        parcelId: receipt.parcelId,
        vehicle: receipt.vehicle,
        tunnel: receipt.tunnel,
        status: receipt.status,
        deliveredAt: receipt.deliveredAt ?? "",
        reason: receipt.reason ?? "",
    })));
    await runtime.stop();
}
void runDemo();
