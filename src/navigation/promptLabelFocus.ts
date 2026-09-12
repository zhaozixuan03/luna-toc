/** Selects an evidence-bound task focus for contextual Smart Labels. */

import type {
  PromptLabelCandidate,
  PromptLabelCandidateKind,
} from './promptLabelContext';
import type { PromptReplyType } from './promptLabels';

export type PromptLabelStance =
  | 'affirmative'
  | 'uncertain'
  | 'negative'
  | 'questioning'
  | 'unspecified';

export interface PromptLabelFocusFrame {
  act: PromptReplyType;
  stance: PromptLabelStance;
  object: string | null;
  taskOrRelation: string | null;
  qualifiers: string[];
  evidenceRefs: Array<Pick<PromptLabelCandidate, 'id' | 'sourceMessageId' | 'sourceStart' | 'sourceEnd'>>;
}

export interface PromptLabelFocusResult {
  frame: PromptLabelFocusFrame;
  selected: PromptLabelCandidate | null;
  validCandidates: PromptLabelCandidate[];
}

const SOURCE_RANK: Record<PromptLabelCandidateKind, number> = {
  'response-task': 0,
  'prompt-task': 1,
  'response-topic': 2,
  'response-heading': 3,
  'previous-question': 4,
  'previous-option': 5,
};

/** Rejects unsafe relations and selects the strongest local task evidence. */
export function resolvePromptLabelFocus(
  replyType: PromptReplyType,
  candidates: PromptLabelCandidate[]
): PromptLabelFocusResult {
  const validCandidates = candidates
    .filter((candidate) => isSafeCandidate(candidate.text))
    .sort((left, right) =>
      SOURCE_RANK[left.kind] - SOURCE_RANK[right.kind] ||
      Number(left.contextTruncated) - Number(right.contextTruncated) ||
      left.sourceStart - right.sourceStart
    );
  const selected = validCandidates[0] ?? null;
  const stance = inferStance(replyType);
  return {
    selected,
    validCandidates,
    frame: {
      act: replyType,
      stance,
      object: selected?.text ?? null,
      taskOrRelation: selected ? relationForCandidate(selected) : null,
      qualifiers: selected ? extractQualifiers(selected.text) : [],
      evidenceRefs: selected
        ? [{
            id: selected.id,
            sourceMessageId: selected.sourceMessageId,
            sourceStart: selected.sourceStart,
            sourceEnd: selected.sourceEnd,
          }]
        : [],
    },
  };
}

function isSafeCandidate(label: string): boolean {
  if (!label || label.length > 240) return false;
  if (/^(?:已完成|已经完成|完成了|accepted|finished|completed)\b/iu.test(label)) return false;
  return true;
}

function inferStance(replyType: PromptReplyType): PromptLabelStance {
  if (replyType === 'uncertain') return 'uncertain';
  if (replyType === 'clarify') return 'questioning';
  if (
    replyType === 'acknowledge' ||
    replyType === 'continue' ||
    replyType === 'authorize' ||
    replyType === 'choice'
  ) {
    return 'affirmative';
  }
  return 'unspecified';
}

function relationForCandidate(candidate: PromptLabelCandidate): string {
  if (candidate.kind === 'previous-question') return 'continue-understanding';
  if (candidate.kind === 'previous-option') return 'select-option';
  if (/^(?:确认|制作|整理|修改|比较|分析|排查|修复|实现|设计)/u.test(candidate.text)) {
    return candidate.text.match(/^[\p{Script=Han}]+/u)?.[0] ?? 'task';
  }
  return 'continue-topic';
}

function extractQualifiers(label: string): string[] {
  return [...new Set(label.match(/\d+(?:\.\d+)?\s*(?:kHz|MHz|GHz|Hz|%|页)?|\b(?:PDF|LaTeX|CV|P\d+)\b/giu) ?? [])];
}
