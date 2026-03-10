import { test } from "node:test";
import * as assert from "node:assert/strict";
import { CAPABILITY_IDS } from "../capabilities/constants";
import { LanguageCapability } from "../capabilities/adaptors/language-capability";
import { RetrievalCapability } from "../capabilities/adaptors/retrieval-capability";
import { CapabilityRegistry } from "../capabilities/registry/capability-registry";

test("capability registry registers and retrieves capabilities", () => {
  const registry = new CapabilityRegistry();
  const language = new LanguageCapability().getCapabilityDefinition();
  registry.register(language);

  const found = registry.getById(CAPABILITY_IDS.LANGUAGE);
  assert.ok(found);
  assert.equal(found?.capabilityId, CAPABILITY_IDS.LANGUAGE);
});

test("capability registry lists active capabilities and filters by family", () => {
  const registry = new CapabilityRegistry();
  registry.register(new LanguageCapability().getCapabilityDefinition());
  registry.register(new RetrievalCapability().getCapabilityDefinition());

  const active = registry.listActive();
  assert.equal(active.length >= 2, true);
  const knowledge = registry.listByFamily("knowledge");
  assert.equal(knowledge.length >= 2, true);
});

test("capability registry invokable check blocks suspended capability", () => {
  const registry = new CapabilityRegistry();
  const definition = new LanguageCapability().getCapabilityDefinition();
  registry.register({
    ...definition,
    status: "suspended",
  });

  assert.equal(registry.isInvokable(definition.capabilityId), false);
});

test("capability registry rejects invalid definitions", () => {
  const registry = new CapabilityRegistry();
  const definition = new LanguageCapability().getCapabilityDefinition();

  assert.throws(
    () =>
      registry.register({
        ...definition,
        capabilityId: " ",
      }),
    /capability_definition_invalid:capabilityId/
  );
  assert.throws(
    () =>
      registry.register({
        ...definition,
        allowedOperations: [],
      }),
    /capability_definition_invalid:allowedOperations/
  );
});
