import type { Partner } from "@cms/payload-types";

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
  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    (err instanceof TypeError && /fetch failed/i.test(err.message))
  );
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

export const getPartners = async (): Promise<Partner[]> => {
  const params = new URLSearchParams({
    limit: "100",
    sort: "displayOrder",
    depth: "1",
  });
  // Drafts enabled on Partners → API defaults to returning only published docs.
  const data = await fetchJson<PayloadList<Partner>>(
    `/api/partners?${params}`,
    emptyList<Partner>(),
  );
  return data.docs;
};

// Forwards the editor's auth cookie so the CMS recognises the request as
// authenticated and returns drafts. Used by /preview/* SSR routes.
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
