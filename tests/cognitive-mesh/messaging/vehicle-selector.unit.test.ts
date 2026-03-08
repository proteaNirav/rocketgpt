import { test } from "node:test";
import { strict as assert } from "node:assert";
import { VehicleSelector } from "../../../src/core/cognitive-mesh/runtime/messaging/vehicle-selector";
import type { CognitiveParcel } from "../../../src/core/cognitive-mesh/runtime/messaging/types/parcel";

const now = new Date().toISOString();

function makeParcel(overrides: Partial<CognitiveParcel>): CognitiveParcel {
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

test("vehicle selector chooses public bus for normal internal", () => {
  const selector = new VehicleSelector();
  const result = selector.select(makeParcel({}));
  assert.equal(result.vehicleType, "public-bus");
  assert.equal(result.dedicatedDispatch, false);
});

test("vehicle selector chooses secure private car for restricted payload", () => {
  const selector = new VehicleSelector();
  const result = selector.select(
    makeParcel({
      profile: {
        sizeClass: "small",
        sensitivity: "restricted",
        replayable: false,
        requiresChainOfCustody: true,
      },
    })
  );
  assert.equal(result.vehicleType, "secure-private-car");
  assert.equal(result.dedicatedDispatch, true);
});

test("vehicle selector chooses rocket for emergency", () => {
  const selector = new VehicleSelector();
  const result = selector.select(makeParcel({ priority: "emergency" }));
  assert.equal(result.vehicleType, "rocket");
  assert.equal(result.tunnel, "emergency");
});
