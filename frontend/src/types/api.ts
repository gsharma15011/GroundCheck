export type ClaimStatus = 'SUPPORTED' | 'UNSUPPORTED' | 'CONTRADICTED' | 'REVIEW';

export type EngineMode = 'LIVE' | 'DEMO' | 'DEGRADED';

export type SanitizationPolicy = 'remove_unsafe' | 'correct_from_canonical_source';

export type MutationOutcome = 'PASS' | 'FAIL' | 'ABSTAIN' | 'SKIPPED';

export interface SourceLocation {
  page?: number | null;
  line_start?: number | null;
  line_end?: number | null;
  section?: string | null;
}

export interface NLIScores {
  entailment: number;
  neutral: number;
  contradiction: number;
}

export interface FactGuardResult {
  checked: boolean;
  passed: boolean;
  detected_facts: Record<string, any>;
  canonical_match?: Record<string, any> | null;
  conflict_detected: boolean;
  reason?: string | null;
}

export interface ConflictMetadata {
  has_conflict: boolean;
  conflict_type?: string | null;
  details?: string | null;
}

export interface EvidenceCandidate {
  chunk_id: string;
  document_id: string;
  document_name: string;
  section: string;
  text: string;
  retrieval_score: number;
  dense_score?: number | null;
  lexical_score?: number | null;
  nli_scores?: NLIScores | null;
  is_canonical: boolean;
  version?: string | null;
  policy_category?: string | null;
}

export interface ClaimVerificationResult {
  claim_id: string;
  claim_text: string;
  status: ClaimStatus;
  confidence_score: number;
  matching_source_snippet?: string | null;
  document_name?: string | null;
  document_id?: string | null;
  chunk_id?: string | null;
  source_location?: SourceLocation | null;
  retrieval_score: number;
  nli_scores?: NLIScores | null;
  explanation: string;
  fact_guard?: FactGuardResult | null;
  conflict_metadata?: ConflictMetadata | null;
  evidence_candidates: EvidenceCandidate[];
}

export interface AuditMetrics {
  trust_score?: number | null;
  verification_coverage: number;
  supported_count: number;
  unsupported_count: number;
  contradicted_count: number;
  review_count: number;
  total_claims: number;
  evaluated_claims: number;
  processing_time_ms: number;
}

export interface VerifyRequest {
  query: string;
  response: string;
  corpus_id?: string;
  top_k?: number;
  demo_mode?: boolean;
}

export interface VerifyResponse {
  audit_id: string;
  query: string;
  raw_response: string;
  claims: ClaimVerificationResult[];
  metrics: AuditMetrics;
  engine_readiness: string;
  processing_time_ms: number;
  warnings: string[];
}

export interface ReplacedClaim {
  original_claim: string;
  replacement_claim: string;
  canonical_chunk_id: string;
  canonical_fact: string;
}

export interface SanitizeRequest {
  query: string;
  response: string;
  audit_id?: string;
  corpus_id?: string;
  policy?: SanitizationPolicy;
  preserve_supported_claims?: boolean;
  demo_mode?: boolean;
}

export interface SanitizeResponse {
  sanitized_response: string;
  removed_claims: string[];
  replaced_claims: ReplacedClaim[];
  final_audit: VerifyResponse;
  fully_supported: boolean;
  warnings: string[];
  sanitization_policy: string;
}

export interface MutationCaseResult {
  test_id: string;
  source_claim_id: string;
  mutation_family: string;
  original_text: string;
  mutated_text: string;
  expected_status: string;
  actual_status: string;
  pass_fail_abstain: MutationOutcome;
  evidence_ids: string[];
  explanation: string;
  model_mode: string;
  duration_ms: number;
}

export interface MutationSuiteRequest {
  audit_id?: string;
  claims?: ClaimVerificationResult[];
  mutation_families?: string[];
  max_cases?: number;
  demo_mode?: boolean;
}

export interface MutationSuiteResponse {
  suite_id: string;
  cases: MutationCaseResult[];
  passed: number;
  failed: number;
  abstained: number;
  skipped: number;
  evaluated_count: number;
  robustness_score?: number | null;
  coverage: number;
  mode: string;
  processing_time_ms: number;
}

export interface LineageNode {
  id: string;
  label: string;
  type: 'claim' | 'evidence_chunk' | 'source_document' | 'verdict' | 'sanitization_action' | 'final_claim' | string;
  metadata: Record<string, any>;
}

export interface LineageEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string | null;
}

export interface LineageGraph {
  audit_id: string;
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export interface EvidenceChunkItem {
  chunk_id: string;
  document_id: string;
  document_name: string;
  section: string;
  version: string;
  policy_category: string;
  text: string;
  is_canonical: boolean;
  references_count: number;
}

export interface HistorySummaryItem {
  audit_id: string;
  timestamp: string;
  query_snippet: string;
  mode: string;
  trust_score?: number | null;
  total_claims: number;
  supported_count: number;
  unsupported_count: number;
  contradicted_count: number;
  review_count: number;
  sanitized: boolean;
  fully_supported?: boolean | null;
}

export interface StatusResponse {
  api_ready: boolean;
  corpus_loaded: boolean;
  corpus_documents_count: number;
  corpus_chunks_count: number;
  retrieval_model_ready: boolean;
  nli_model_ready: boolean;
  current_mode: string;
  version: string;
  device: string;
  model_init_errors: string[];
}
