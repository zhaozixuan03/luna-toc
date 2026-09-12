/** Keeps developer-only Smart Label diagnostics in bounded tab memory. */

export type PromptLabelNeed = 'yes' | 'no' | 'ambiguous' | 'unknown';
export type PromptLabelRoute =
  | 'keep'
  | 'complete'
  | 'compress'
  | 'complete_then_compress'
  | 'abstain';
export type PromptLabelStageStatus =
  | 'not_run'
  | 'passed'
  | 'rejected'
  | 'deferred'
  | 'error';

export type PromptLabelReasonCode =
  | 'MODE_RAW'
  | 'RAW_ALREADY_USEFUL'
  | 'LABEL_ACCEPTED'
  | 'CLASSIFIER_UNCERTAIN'
  | 'CONTEXT_MISSING'
  | 'SOURCE_INCOMPLETE'
  | 'CONTEXT_TRUNCATED'
  | 'NO_CANDIDATES'
  | 'NO_VALID_CANDIDATES'
  | 'AMBIGUOUS_FOCUS'
  | 'STANCE_CONFLICT'
  | 'OPTION_AMBIGUOUS'
  | 'UNSUPPORTED_RELATION'
  | 'TOPIC_CONFLICT'
  | 'NO_NAVIGATION_GAIN'
  | 'COMPRESSION_LOSS'
  | 'LAYOUT_UNFIT'
  | 'CACHE_HIT'
  | 'CACHE_MISS'
  | 'CACHE_STALE'
  | 'CACHE_UNVERIFIABLE'
  | 'STALE_RESULT_DROPPED'
  | 'INTERNAL_ERROR';

export interface PromptLabelStageStatuses {
  classify: PromptLabelStageStatus;
  evidence: PromptLabelStageStatus;
  candidates: PromptLabelStageStatus;
  guards: PromptLabelStageStatus;
  compression: PromptLabelStageStatus;
  layout: PromptLabelStageStatus;
}

export interface PromptLabelDiagnosticTrace {
  traceId: string;
  conversationKey: string;
  messageId: string;
  sourceSignature: string;
  algorithmVersion: number;
  completionNeed: PromptLabelNeed;
  compressionNeed: PromptLabelNeed;
  route: PromptLabelRoute;
  primaryReason: PromptLabelReasonCode;
  allReasons: PromptLabelReasonCode[];
  stageStatuses: PromptLabelStageStatuses;
  evidenceCount: number;
  candidateCount: number;
  validCandidateCount: number;
  selectedCandidateId?: string;
  sourceKinds: string[];
  sourceComplete: boolean;
  contextTruncated: boolean;
  cacheStatus: 'hit' | 'miss' | 'stale' | 'unverifiable' | 'not_checked';
  layoutFit: 'fit' | 'unfit' | 'unmeasured';
  elapsedMs: number;
  createdAt: number;
}

const MAX_TRACES = 1_000;
const DEBUG_STORAGE_KEY = 'luna:debugSmartLabels';
const traces: PromptLabelDiagnosticTrace[] = [];
let nextTraceSequence = 1;

/** Creates a tab-local trace identifier without exposing message content. */
export function createPromptLabelTraceId(): string {
  const traceId = `smart-label-${Date.now()}-${nextTraceSequence}`;
  nextTraceSequence += 1;
  return traceId;
}

/** Records a bounded diagnostic trace and logs it only when explicitly enabled. */
export function recordPromptLabelTrace(trace: PromptLabelDiagnosticTrace): void {
  const existingIndex = traces.findIndex((candidate) =>
    candidate.conversationKey === trace.conversationKey &&
    candidate.messageId === trace.messageId &&
    candidate.sourceSignature === trace.sourceSignature &&
    candidate.route === trace.route
  );
  if (existingIndex >= 0) traces.splice(existingIndex, 1);
  traces.push(structuredClone(trace));
  if (traces.length > MAX_TRACES) traces.splice(0, traces.length - MAX_TRACES);

  if (isPromptLabelDebugEnabled()) {
    console.debug('[LunaTOC Smart Label]', structuredClone(trace));
  }
}

/** Returns a read-only snapshot for developer inspection and tests. */
export function getPromptLabelDiagnosticTraces(): PromptLabelDiagnosticTrace[] {
  return structuredClone(traces);
}

/** Clears only the in-memory developer diagnostic buffer. */
export function clearPromptLabelDiagnosticTraces(): void {
  traces.length = 0;
}

function isPromptLabelDebugEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(DEBUG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}
