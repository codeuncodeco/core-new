import type { Service, Project, RateCardSetting, Category, Tag, Brand, Partner } from "@cms/payload-types";

export type ServiceWithRefs = Omit<Service, "category" | "tags"> & {
  category: Category;
  tags?: (Tag | number)[] | null;
};

export const resolveRef = <T extends { id: number | string }>(v: T | number | string): T => {
  if (typeof v === "number" || typeof v === "string") {
    throw new Error(`Unresolved relationship (id ${v}); bump fetch depth.`);
  }
  return v;
};

const CMS_URL = import.meta.env.PUBLIC_CMS_URL || "http://localhost:3000";

export const mediaUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${CMS_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

type PayloadList<T> = {
  docs: T[];
  totalDocs: number;
  hasNextPage: boolean;
  page: number;
};

const isCmsDown = (err: unknown): boolean => {
  const cause = (err as { cause?: { code?: string } })?.cause;
  const code = cause?.code;
  return code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT" ||
    (err instanceof TypeError && /fetch failed/i.test(err.message));
};

const fetchJson = async <T>(path: string, fallback: T): Promise<T> => {
  try {
    const res = await fetch(`${CMS_URL}${path}`);
    if (!res.ok) {
      throw new Error(`CMS fetch failed: ${res.status} ${res.statusText} - ${path}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (isCmsDown(err)) {
      console.warn(`[cms] unreachable at ${CMS_URL}, using fallback for ${path}`);
      return fallback;
    }
    throw err;
  }
};

const emptyList = <T>(): PayloadList<T> => ({
  docs: [],
  totalDocs: 0,
  hasNextPage: false,
  page: 1,
});

const rateCardFallback = {
  id: 0,
  updatedAt: new Date(0).toISOString(),
  createdAt: new Date(0).toISOString(),
} as unknown as RateCardSetting;

export const getPublishedServices = async (): Promise<Service[]> => {
  const params = new URLSearchParams({
    limit: "200",
    sort: "displayOrder",
    depth: "1",
  });
  // Drafts enabled → API returns only published by default for public reads.
  const data = await fetchJson<PayloadList<Service>>(`/api/services?${params}`, emptyList<Service>());
  return data.docs;
};

export const getServiceBySlug = async (slug: string): Promise<Service | null> => {
  const params = new URLSearchParams({
    "where[slug][equals]": slug,
    limit: "1",
    depth: "1",
  });
  const data = await fetchJson<PayloadList<Service>>(`/api/services?${params}`, emptyList<Service>());
  return data.docs[0] ?? null;
};

export const getCategories = async (): Promise<Category[]> => {
  const params = new URLSearchParams({
    limit: "50",
    sort: "displayOrder",
    depth: "0",
  });
  const data = await fetchJson<PayloadList<Category>>(`/api/categories?${params}`, emptyList<Category>());
  return data.docs;
};

export const getRateCardSettings = async (): Promise<RateCardSetting> => {
  return fetchJson<RateCardSetting>("/api/globals/rate-card-settings?depth=0", rateCardFallback);
};

export const getPublishedProjects = async (): Promise<Project[]> => {
  const params = new URLSearchParams({
    limit: "500",
    sort: "displayOrder",
    depth: "1",
  });
  // Drafts enabled → API returns only published by default for public reads.
  const data = await fetchJson<PayloadList<Project>>(`/api/projects?${params}`, emptyList<Project>());
  return data.docs;
};

export const getProjectBySlug = async (slug: string): Promise<Project | null> => {
  const params = new URLSearchParams({
    "where[slug][equals]": slug,
    limit: "1",
    depth: "1",
  });
  const data = await fetchJson<PayloadList<Project>>(`/api/projects?${params}`, emptyList<Project>());
  return data.docs[0] ?? null;
};

export const getPartners = async (): Promise<Partner[]> => {
  const params = new URLSearchParams({
    limit: "100",
    sort: "displayOrder",
    depth: "1", // resolves image → Media so we can read url/alt
  });
  // With versions.drafts enabled on Partners, the REST API defaults to
  // returning only published docs — no explicit published filter needed.
  const data = await fetchJson<PayloadList<Partner>>(`/api/partners?${params}`, emptyList<Partner>());
  return data.docs;
};

// Preview variants for SSR routes. Forward the editor's auth cookie so the
// CMS recognises the request as authenticated and returns drafts. On CMS
// down, return an empty fallback so the preview page still renders.
const previewFetch = async <T>(
  path: string,
  cookie: string | null,
  fallback: T,
): Promise<T> => {
  try {
    const res = await fetch(`${CMS_URL}${path}`, {
      headers: cookie ? { cookie } : {},
    });
    if (!res.ok) {
      throw new Error(`CMS preview fetch failed: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (isCmsDown(err)) {
      console.warn(`[cms] unreachable, preview fallback empty`);
      return fallback;
    }
    throw err;
  }
};

export const getPartnersPreview = async (cookie: string | null): Promise<Partner[]> => {
  const params = new URLSearchParams({
    draft: "true",
    limit: "100",
    sort: "displayOrder",
    depth: "1",
  });
  const data = await previewFetch<PayloadList<Partner>>(
    `/api/partners?${params}`,
    cookie,
    emptyList<Partner>(),
  );
  return data.docs;
};

export const getBrandsPreview = async (cookie: string | null): Promise<Brand[]> => {
  const params = new URLSearchParams({
    draft: "true",
    limit: "100",
    sort: "name",
    depth: "1",
  });
  const data = await previewFetch<PayloadList<Brand>>(
    `/api/brands?${params}`,
    cookie,
    emptyList<Brand>(),
  );
  return data.docs;
};

export const getPublishedServicesPreview = async (cookie: string | null): Promise<Service[]> => {
  const params = new URLSearchParams({
    draft: "true",
    limit: "200",
    sort: "displayOrder",
    depth: "1",
  });
  const data = await previewFetch<PayloadList<Service>>(
    `/api/services?${params}`,
    cookie,
    emptyList<Service>(),
  );
  return data.docs;
};

export const getPublishedProjectsPreview = async (cookie: string | null): Promise<Project[]> => {
  const params = new URLSearchParams({
    draft: "true",
    limit: "500",
    sort: "displayOrder",
    depth: "1",
  });
  const data = await previewFetch<PayloadList<Project>>(
    `/api/projects?${params}`,
    cookie,
    emptyList<Project>(),
  );
  return data.docs;
};

export const getBrands = async (): Promise<Brand[]> => {
  const params = new URLSearchParams({
    limit: "100",
    sort: "name",
    depth: "1", // resolves image → Media so we can read url/alt
  });
  const data = await fetchJson<PayloadList<Brand>>(`/api/brands?${params}`, emptyList<Brand>());
  return data.docs;
};
