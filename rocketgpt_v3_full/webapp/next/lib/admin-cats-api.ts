export type CatStatus = "draft" | "review" | "approved" | "active" | "deprecated" | "revoked";

export type CatDto = {
  catId: string;
  tenantId: string;
  ownerUserId: string | null;
  name: string;
  description: string | null;
  status: CatStatus;
  createdAt: string;
  updatedAt: string;
};

export type CatVersionDto = {
  catVersionId: string;
  catId: string;
  version: string;
  manifestJson: Record<string, unknown>;
  rulebookJson: Record<string, unknown>;
  commandBundleRef: string | null;
  status: string;
  createdAt: string;
};

type ListCatsResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: CatDto[];
};

type ListVersionsResponse = {
  items: CatVersionDto[];
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });
  const text = await response.text();
  let body: unknown = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { detail: text };
    }
  }
  if (!response.ok) {
    const detail = (body as any)?.detail || (body as any)?.error || response.statusText;
    throw new Error(String(detail));
  }
  return body as T;
}

export function listCats(page = 1, pageSize = 20): Promise<ListCatsResponse> {
  return requestJson<any>(`/api/_admin/cats?page=${page}&pageSize=${pageSize}`).then((response) => ({
    page: response.page,
    pageSize: response.pageSize,
    total: response.total,
    items: (response.items || []).map(toCatDto),
  }));
}

export function createCat(input: { name: string; description?: string }): Promise<CatDto> {
  return requestJson<any>("/api/_admin/cats", {
    method: "POST",
    body: JSON.stringify(input),
  }).then(toCatDto);
}

export function getCat(catId: string): Promise<CatDto> {
  return requestJson<any>(`/api/_admin/cats/${encodeURIComponent(catId)}`).then(toCatDto);
}

export function updateCat(catId: string, input: { name: string; description?: string }): Promise<CatDto> {
  return requestJson<any>(`/api/_admin/cats/${encodeURIComponent(catId)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }).then(toCatDto);
}

export function publishCatVersion(
  catId: string,
  input: {
    version: string;
    manifestJson: Record<string, unknown>;
    rulebookJson: Record<string, unknown>;
    commandBundleRef: string;
  }
): Promise<CatVersionDto> {
  return requestJson<any>(`/api/_admin/cats/${encodeURIComponent(catId)}/versions`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then(toVersionDto);
}

export function listCatVersions(catId: string): Promise<ListVersionsResponse> {
  return requestJson<any>(`/api/_admin/cats/${encodeURIComponent(catId)}/versions`).then((response) => ({
    items: (response.items || []).map(toVersionDto),
  }));
}

export function transitionCat(catId: string, targetStatus: CatStatus): Promise<CatDto> {
  return requestJson<any>(`/api/_admin/cats/${encodeURIComponent(catId)}/transition`, {
    method: "POST",
    body: JSON.stringify({ targetStatus }),
  }).then(toCatDto);
}

function toCatDto(row: any): CatDto {
  return {
    catId: row.id,
    tenantId: row.tenant_id,
    ownerUserId: row.owner_user_id ?? null,
    name: row.name,
    description: row.description ?? null,
    status: row.status as CatStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toVersionDto(row: any): CatVersionDto {
  return {
    catVersionId: row.id,
    catId: row.cat_id,
    version: row.version,
    manifestJson: row.manifest_json || {},
    rulebookJson: row.rulebook_json || {},
    commandBundleRef: row.command_bundle_ref ?? null,
    status: row.status,
    createdAt: row.created_at,
  };
}
