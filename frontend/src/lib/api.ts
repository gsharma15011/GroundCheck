import {
  VerifyRequest,
  VerifyResponse,
  SanitizeRequest,
  SanitizeResponse,
  MutationSuiteRequest,
  MutationSuiteResponse,
  EvidenceChunkItem,
  HistorySummaryItem,
  StatusResponse,
  LineageGraph,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = errorJson.detail;
      }
    } catch {
      // Use fallback error message
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  getStatus: (): Promise<StatusResponse> => request<StatusResponse>('/api/status'),
  
  getHealth: (): Promise<{ status: string; app: string; version: string }> =>
    request('/health'),

  verify: (req: VerifyRequest): Promise<VerifyResponse> =>
    request<VerifyResponse>('/api/verify', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  sanitize: (req: SanitizeRequest): Promise<SanitizeResponse> =>
    request<SanitizeResponse>('/api/sanitize', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  mutationTests: (req: MutationSuiteRequest): Promise<MutationSuiteResponse> =>
    request<MutationSuiteResponse>('/api/mutation-tests', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  getLineage: (auditId: string): Promise<LineageGraph> =>
    request<LineageGraph>(`/api/lineage/${encodeURIComponent(auditId)}`),

  getEvidence: (params?: {
    search?: string;
    corpus_id?: string;
    document_type?: string;
    version?: string;
  }): Promise<EvidenceChunkItem[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.corpus_id) query.set('corpus_id', params.corpus_id);
    if (params?.document_type) query.set('document_type', params.document_type);
    if (params?.version) query.set('version', params.version);
    const qs = query.toString();
    return request<EvidenceChunkItem[]>(`/api/evidence${qs ? `?${qs}` : ''}`);
  },

  getHistory: (): Promise<HistorySummaryItem[]> =>
    request<HistorySummaryItem[]>('/api/history'),

  getSingleAudit: (auditId: string): Promise<any> =>
    request<any>(`/api/history/${encodeURIComponent(auditId)}`),

  clearHistory: (): Promise<{ message: string }> =>
    request<{ message: string }>('/api/history', { method: 'DELETE' }),
};
