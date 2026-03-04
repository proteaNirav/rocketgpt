const CORE_BASE = "/api/core";

export type CatsRegistryEntry = {
  cat_id?: string;
  publisher_namespace?: string;
  status?: string;
  passport_id?: string;
  passport_required?: boolean;
  issuer?: string;
  created_at_utc?: string;
};

export type CatsRegistryResponse = {
  version?: number;
  namespaces?: Record<string, CatsRegistryEntry>;
};

export type CatDefinition = {
  cat_id?: string;
  name?: string;
  description?: string;
  owner?: "system" | "user";
  type?: "governance" | "ops" | "analysis" | "demo";
  version?: string;
  entrypoint?: string;
  runtime_mode?: "strict" | "standard" | "demo";
  requires_approval?: boolean;
  allowed_side_effects?: Array<"none" | "ledger_write" | "read_only" | "workflow_dispatch">;
  tags?: string[];
  canonical_name?: string;
  publisher_namespace?: string;
  passport_required?: boolean;
  passport_id?: string;
};

export type CatPassport = {
  passport_id?: string;
  cat_id?: string;
  canonical_name?: string;
  status?: string;
  issuer?: string;
  issued_at_utc?: string;
  expires_at_utc?: string;
  bundle_digest?: string;
};

export type CatLibraryRow = {
  canonicalName: string;
  registryEntry: CatsRegistryEntry;
  definition: CatDefinition | null;
  definitionError: string | null;
  passport: CatPassport | null;
  passportError: string | null;
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${CORE_BASE}${path}`, {
    method: "GET",
    cache: "no-store",
  });

  const raw = await response.text();
  let body: any = {};
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = { detail: raw };
    }
  }

  if (!response.ok) {
    const detail = body?.detail || body?.message || body?.error || response.statusText;
    throw new Error(String(detail || `Request failed: ${response.status}`));
  }

  return body as T;
}

export function getCatsRegistry(): Promise<CatsRegistryResponse> {
  return getJson<CatsRegistryResponse>("/cats/registry");
}

export function getCatDefinition(catId: string): Promise<CatDefinition> {
  return getJson<CatDefinition>(`/cats/${encodeURIComponent(catId)}/definition`);
}

export function getCatPassport(catId: string): Promise<CatPassport> {
  return getJson<CatPassport>(`/cats/${encodeURIComponent(catId)}/passport`);
}

export async function getCatsLibraryRows(): Promise<CatLibraryRow[]> {
  const registry = await getCatsRegistry();
  const namespaces = registry.namespaces || {};
  const canonicalNames = Object.keys(namespaces).sort((a, b) => a.localeCompare(b));

  return Promise.all(
    canonicalNames.map(async (canonicalName) => {
      const registryEntry = namespaces[canonicalName] || {};
      const catId = String(registryEntry.cat_id || "").trim();

      if (!catId) {
        return {
          canonicalName,
          registryEntry,
          definition: null,
          definitionError: "Missing cat_id in registry entry.",
          passport: null,
          passportError: "Missing cat_id in registry entry.",
        };
      }

      const [definitionResult, passportResult] = await Promise.allSettled([
        getCatDefinition(catId),
        getCatPassport(catId),
      ]);

      return {
        canonicalName,
        registryEntry,
        definition: definitionResult.status === "fulfilled" ? definitionResult.value : null,
        definitionError:
          definitionResult.status === "rejected"
            ? definitionResult.reason?.message || "Failed to load definition."
            : null,
        passport: passportResult.status === "fulfilled" ? passportResult.value : null,
        passportError:
          passportResult.status === "rejected"
            ? passportResult.reason?.message || "Failed to load passport."
            : null,
      };
    })
  );
}
