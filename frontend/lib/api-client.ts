/**
 * Typed FastAPI client. Isomorphic: pass a token provider appropriate for the
 * environment (browser session or server session).
 */
import { getApiUrl } from "@/lib/env";
import type {
  DiseaseListResponse,
  FeedbackRequest,
  FeedbackResponse,
  PredictionResponse,
  PredictionSummary,
  ProfileResponse,
  ApiErrorShape,
} from "@/lib/types";

export class LeafwiseApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "LeafwiseApiError";
  }
}

type GetToken = () => Promise<string | null>;

async function request<T>(
  path: string,
  getToken: GetToken,
  init: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (auth) {
    const token = await getToken();
    if (!token) {
      throw new LeafwiseApiError(401, "UNAUTHENTICATED", "Please sign in again.");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, {
      ...init,
      headers,
      credentials: "omit",
    });
  } catch {
    throw new LeafwiseApiError(
      0,
      "NETWORK_ERROR",
      "Could not reach the service. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    let body: ApiErrorShape = {};
    try {
      body = (await response.json()) as ApiErrorShape;
    } catch {
      // Non-JSON error (e.g. an HTML gateway page) — use the safe fallback.
    }
    throw new LeafwiseApiError(
      response.status,
      body.error?.code ?? "HTTP_ERROR",
      body.error?.message ?? "The request could not be completed.",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function createApiClient(getToken: GetToken) {
  return {
    getMe: () => request<ProfileResponse>("/api/v1/me", getToken),

    listDiseases: () =>
      request<DiseaseListResponse>("/api/v1/diseases", getToken, {}, false),

    createPrediction: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<PredictionResponse>("/api/v1/predictions", getToken, {
        method: "POST",
        body: form,
      });
    },

    listPredictions: (params?: { limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.limit !== undefined) query.set("limit", String(params.limit));
      if (params?.offset !== undefined) query.set("offset", String(params.offset));
      const suffix = query.size ? `?${query.toString()}` : "";
      return request<PredictionSummary[]>(`/api/v1/predictions${suffix}`, getToken);
    },

    getPrediction: (id: string, includeImage = false) =>
      request<PredictionResponse>(
        `/api/v1/predictions/${encodeURIComponent(id)}?include_image=${includeImage}`,
        getToken,
      ),

    deletePrediction: (id: string) =>
      request<void>(
        `/api/v1/predictions/${encodeURIComponent(id)}`,
        getToken,
        { method: "DELETE" },
      ),

    submitFeedback: (id: string, payload: FeedbackRequest) =>
      request<FeedbackResponse>(
        `/api/v1/predictions/${encodeURIComponent(id)}/feedback`,
        getToken,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      ),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
