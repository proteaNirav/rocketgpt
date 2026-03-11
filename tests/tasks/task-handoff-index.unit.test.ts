import * as assert from "node:assert/strict";
import { test } from "node:test";
import {
  getHandoffFlow,
  listHandoffFlows,
  listHandoffFlowsBySourceRole,
  listHandoffFlowsByTargetRole,
} from "../../src/tasks/integrations/task-handoff-index";

test("handoff index lists all proven flows", () => {
  const flows = listHandoffFlows();

  assert.deepEqual(
    flows.map((flow) => flow.flowId),
    [
      "consortium_to_brain_oversight",
      "pm_to_learner_planning",
      "learner_to_builder_work_unit",
      "builder_to_cats_execution",
      "cats_to_os_runtime",
    ]
  );
});

test("handoff lookup by flow id and source role works", () => {
  const flow = getHandoffFlow("builder_to_cats_execution");
  const bySource = listHandoffFlowsBySourceRole("cats");

  assert.equal(flow?.targetRole, "cats");
  assert.equal(flow?.integrationId, "builder-cats-execution");
  assert.deepEqual(bySource.map((item) => item.flowId), ["cats_to_os_runtime"]);
});

test("handoff lookup by target role works", () => {
  const learnerTargets = listHandoffFlowsByTargetRole("learner");
  const osTargets = listHandoffFlowsByTargetRole("os");

  assert.deepEqual(learnerTargets.map((item) => item.flowId), ["pm_to_learner_planning"]);
  assert.deepEqual(osTargets.map((item) => item.flowId), ["cats_to_os_runtime"]);
});
