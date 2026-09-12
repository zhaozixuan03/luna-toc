/** Tests bounded, developer-only Smart Label diagnostics. */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearPromptLabelDiagnosticTraces,
  getPromptLabelDiagnosticTraces,
  recordPromptLabelTrace,
  type PromptLabelDiagnosticTrace,
} from '@/navigation/promptLabelDiagnostics';

beforeEach(() => clearPromptLabelDiagnosticTraces());

describe('Prompt Label diagnostics', () => {
  it('replaces repeated render traces instead of appending duplicates', () => {
    const trace: PromptLabelDiagnosticTrace = {
      traceId: 'trace-1', conversationKey: 'conversation', messageId: 'message',
      sourceSignature: 'signature', algorithmVersion: 4,
      completionNeed: 'yes', compressionNeed: 'no', route: 'abstain',
      primaryReason: 'NO_CANDIDATES', allReasons: ['NO_CANDIDATES'],
      stageStatuses: {
        classify: 'passed', evidence: 'rejected', candidates: 'rejected',
        guards: 'not_run', compression: 'not_run', layout: 'deferred',
      },
      evidenceCount: 0, candidateCount: 0, validCandidateCount: 0,
      sourceKinds: [], sourceComplete: true, contextTruncated: false,
      cacheStatus: 'miss', layoutFit: 'unmeasured', elapsedMs: 1, createdAt: 1,
    };
    recordPromptLabelTrace(trace);
    recordPromptLabelTrace({ ...trace, traceId: 'trace-2', createdAt: 2 });

    expect(getPromptLabelDiagnosticTraces()).toEqual([
      expect.objectContaining({ traceId: 'trace-2', createdAt: 2 }),
    ]);
  });
});
