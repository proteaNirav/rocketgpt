"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const constants_1 = require("../capabilities/constants");
const language_capability_1 = require("../capabilities/adaptors/language-capability");
const retrieval_capability_1 = require("../capabilities/adaptors/retrieval-capability");
const capability_registry_1 = require("../capabilities/registry/capability-registry");
(0, node_test_1.test)("capability registry registers and retrieves capabilities", () => {
    const registry = new capability_registry_1.CapabilityRegistry();
    const language = new language_capability_1.LanguageCapability().getCapabilityDefinition();
    registry.register(language);
    const found = registry.getById(constants_1.CAPABILITY_IDS.LANGUAGE);
    assert.ok(found);
    assert.equal(found?.capabilityId, constants_1.CAPABILITY_IDS.LANGUAGE);
});
(0, node_test_1.test)("capability registry lists active capabilities and filters by family", () => {
    const registry = new capability_registry_1.CapabilityRegistry();
    registry.register(new language_capability_1.LanguageCapability().getCapabilityDefinition());
    registry.register(new retrieval_capability_1.RetrievalCapability().getCapabilityDefinition());
    const active = registry.listActive();
    assert.equal(active.length >= 2, true);
    const knowledge = registry.listByFamily("knowledge");
    assert.equal(knowledge.length >= 2, true);
});
(0, node_test_1.test)("capability registry invokable check blocks suspended capability", () => {
    const registry = new capability_registry_1.CapabilityRegistry();
    const definition = new language_capability_1.LanguageCapability().getCapabilityDefinition();
    registry.register({
        ...definition,
        status: "suspended",
    });
    assert.equal(registry.isInvokable(definition.capabilityId), false);
});
(0, node_test_1.test)("capability registry rejects invalid definitions", () => {
    const registry = new capability_registry_1.CapabilityRegistry();
    const definition = new language_capability_1.LanguageCapability().getCapabilityDefinition();
    assert.throws(() => registry.register({
        ...definition,
        capabilityId: " ",
    }), /capability_definition_invalid:capabilityId/);
    assert.throws(() => registry.register({
        ...definition,
        allowedOperations: [],
    }), /capability_definition_invalid:allowedOperations/);
});
