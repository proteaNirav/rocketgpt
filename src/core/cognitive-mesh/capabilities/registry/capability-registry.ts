import type {
  CapabilityDefinition,
  CapabilityFamily,
  CapabilityRegistrySnapshot,
  CapabilityStatus,
} from "../types/capability.types";

const INVOKABLE_STATUSES: CapabilityStatus[] = ["active", "restricted"];

function assertValidDefinition(definition: CapabilityDefinition): void {
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

export class CapabilityRegistry {
  private readonly capabilities = new Map<string, CapabilityDefinition>();

  register(definition: CapabilityDefinition): CapabilityDefinition {
    assertValidDefinition(definition);
    const normalized: CapabilityDefinition = {
      ...definition,
      allowedOperations: [...definition.allowedOperations],
      metadata: definition.metadata ? { ...definition.metadata } : undefined,
    };
    this.capabilities.set(definition.capabilityId, normalized);
    return normalized;
  }

  getById(capabilityId: string): CapabilityDefinition | undefined {
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

  list(): CapabilityDefinition[] {
    return [...this.capabilities.values()].map((item) => ({
      ...item,
      allowedOperations: [...item.allowedOperations],
      metadata: item.metadata ? { ...item.metadata } : undefined,
    }));
  }

  listActive(): CapabilityDefinition[] {
    return this.filterByStatus("active");
  }

  listByFamily(family: CapabilityFamily): CapabilityDefinition[] {
    return this.list().filter((item) => item.family === family);
  }

  filterByStatus(status: CapabilityStatus): CapabilityDefinition[] {
    return this.list().filter((item) => item.status === status);
  }

  isInvokable(capabilityId: string): boolean {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      return false;
    }
    return INVOKABLE_STATUSES.includes(capability.status);
  }

  snapshot(): CapabilityRegistrySnapshot {
    const capabilities = this.list();
    return {
      capabilities,
      totalCount: capabilities.length,
      activeCount: capabilities.filter((item) => item.status === "active").length,
    };
  }
}
