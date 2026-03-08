"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const vehicle_selector_1 = require("../../../src/core/cognitive-mesh/runtime/messaging/vehicle-selector");
const now = new Date().toISOString();
function makeParcel(overrides) {
    return {
        parcelId: "p-1",
        sessionId: "s-1",
        sourceNodeId: "cat-hub",
        sourceNodeClass: "cat",
        targetNodeId: "librarian-hub",
        targetNodeClass: "librarian",
        intent: "index",
        eventType: "evt",
        payload: {},
        profile: {
            sizeClass: "small",
            sensitivity: "internal",
            replayable: true,
            requiresChainOfCustody: false,
        },
        priority: "normal",
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}
(0, node_test_1.test)("vehicle selector chooses public bus for normal internal", () => {
    const selector = new vehicle_selector_1.VehicleSelector();
    const result = selector.select(makeParcel({}));
    node_assert_1.strict.equal(result.vehicleType, "public-bus");
    node_assert_1.strict.equal(result.dedicatedDispatch, false);
});
(0, node_test_1.test)("vehicle selector chooses secure private car for restricted payload", () => {
    const selector = new vehicle_selector_1.VehicleSelector();
    const result = selector.select(makeParcel({
        profile: {
            sizeClass: "small",
            sensitivity: "restricted",
            replayable: false,
            requiresChainOfCustody: true,
        },
    }));
    node_assert_1.strict.equal(result.vehicleType, "secure-private-car");
    node_assert_1.strict.equal(result.dedicatedDispatch, true);
});
(0, node_test_1.test)("vehicle selector chooses rocket for emergency", () => {
    const selector = new vehicle_selector_1.VehicleSelector();
    const result = selector.select(makeParcel({ priority: "emergency" }));
    node_assert_1.strict.equal(result.vehicleType, "rocket");
    node_assert_1.strict.equal(result.tunnel, "emergency");
});
