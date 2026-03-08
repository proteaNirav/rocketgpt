"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityRegistry = void 0;
const INVOKABLE_STATUSES = ["active", "restricted"];
function assertValidDefinition(definition) {
    if (definition.capabilityId.trim().length === 0) {
        throw new Error("capability_definition_invalid:capabilityId");
    }
    if (definition.name.trim().length === 0) {
        throw new Error("capability_definition_invalid:name");
    }
    if (definition.version.trim().length === 0) {
        throw new Error("capability_definition_invalid:version");
    }
    if (definition.ownerAuthority.trim().length === 0) {
        throw new Error("capability_definition_invalid:ownerAuthority");
    }
    if (definition.allowedOperations.length === 0) {
        throw new Error("capability_definition_invalid:allowedOperations");
    }
}
class CapabilityRegistry {
    constructor() {
        this.capabilities = new Map();
    }
    register(definition) {
        assertValidDefinition(definition);
        const normalized = {
            ...definition,
            allowedOperations: [...definition.allowedOperations],
            metadata: definition.metadata ? { ...definition.metadata } : undefined,
        };
        this.capabilities.set(definition.capabilityId, normalized);
        return normalized;
    }
    getById(capabilityId) {
        const value = this.capabilities.get(capabilityId);
        if (!value) {
            return undefined;
        }
        return {
            ...value,
            allowedOperations: [...value.allowedOperations],
            metadata: value.metadata ? { ...value.metadata } : undefined,
        };
    }
    list() {
        return [...this.capabilities.values()].map((item) => ({
            ...item,
            allowedOperations: [...item.allowedOperations],
            metadata: item.metadata ? { ...item.metadata } : undefined,
        }));
    }
    listActive() {
        return this.filterByStatus("active");
    }
    listByFamily(family) {
        return this.list().filter((item) => item.family === family);
    }
    filterByStatus(status) {
        return this.list().filter((item) => item.status === status);
    }
    isInvokable(capabilityId) {
        const capability = this.capabilities.get(capabilityId);
        if (!capability) {
            return false;
        }
        return INVOKABLE_STATUSES.includes(capability.status);
    }
    snapshot() {
        const capabilities = this.list();
        return {
            capabilities,
            totalCount: capabilities.length,
            activeCount: capabilities.filter((item) => item.status === "active").length,
        };
    }
}
exports.CapabilityRegistry = CapabilityRegistry;
