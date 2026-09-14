/** Generates conservative, deterministic Smart Labels without network access. */

import {
  cleanLabelMarkdown,
  extractPromptTaskCandidates,
  extractPreviousOptionGroups,
  extractPreviousQuestion,
  extractResponseLabelCandidates,
  type PromptLabelCandidate,
} from './promptLabelContext';
import { compressPromptLabel } from './promptLabelCompression';
import {
  resolvePromptLabelFocus,
  type PromptLabelFocusFrame,
} from './promptLabelFocus';
import type {
  PromptLabelNeed,
  PromptLabelReasonCode,
  PromptLabelRoute,
  PromptLabelStageStatuses,
} from './promptLabelDiagnostics';

export interface PromptLabelInput {
  text: string;
  id?: string;
}

export type PromptReplyType =
  | 'continue'
  | 'authorize'
  | 'acknowledge'
  | 'clarify'
  | 'uncertain'
  | 'choice'
  | 'informative'
  | 'unknown';

export type PromptLabelReason =
  | 'empty'
  | 'exact-trigger'
  | 'acknowledgement'
  | 'continuation'
  | 'understanding-state'
  | 'deictic-reference'
  | 'temporary-note'
  | 'protected-content'
  | 'meaningful-remainder';

export interface PromptLabelDecision {
  isLowInformation: boolean;
  normalizedText: string;
  remainder: string;
  score: number;
  reasons: PromptLabelReason[];
  replyType: PromptReplyType;
}

export interface PromptDisplayLabelInput {
  rawText: string;
  mode: 'raw' | 'smart';
  cachedLabel?: string | null;
  answerHeading?: string | null;
  hasResponse: boolean;
  previousResponses?: PromptLabelInput[];
  currentResponses?: PromptLabelInput[];
  previousPrompt?: PromptLabelInput | null;
  sourceComplete?: boolean;
  cacheStatus?: 'hit' | 'miss' | 'stale' | 'unverifiable' | 'not_checked';
}

export interface PromptDisplayLabelResult {
  label: string;
  shouldStore: boolean;
  decision: PromptLabelDecision;
  decisionType?: string;
  semanticLabel: string;
  completionNeed: PromptLabelNeed;
  compressionNeed: PromptLabelNeed;
  route: PromptLabelRoute;
  primaryReason: PromptLabelReasonCode;
  allReasons: PromptLabelReasonCode[];
  stageStatuses: PromptLabelStageStatuses;
  evidenceCount: number;
  candidateCount: number;
  validCandidateCount: number;
  selectedCandidate?: PromptLabelCandidate;
  focusFrame?: PromptLabelFocusFrame;
  contextTruncated: boolean;
  sourceKinds: string[];
  cacheStatus: 'hit' | 'miss' | 'stale' | 'unverifiable' | 'not_checked';
  elapsedMs: number;
}

interface ContextPattern {
  reason: Exclude<
    PromptLabelReason,
    'empty' | 'exact-trigger' | 'protected-content' | 'meaningful-remainder'
  >;
  pattern: RegExp;
}

const MAX_SEMANTIC_LABEL_LENGTH = 240;
const MAX_HEADING_SCAN_LINES = 40;
const MAX_HEADING_SCAN_CHARACTERS = 1_600;

const EXACT_LOW_INFORMATION_PROMPTS = new Set([
  '继续', '继续吧', '可以', '可以的', '好的', '好', '行', '没问题',
  '为什么', '为什么呢', '然后呢', '接下来呢', 'continue', 'go on',
  'okay', 'ok', 'sure', 'why', 'why is that', 'then what', "what's next",
  'what next',
  '好的,暂时可以继续了。但是我觉得这地方仍然是要标记一下的',
  '好吧,勉勉强强,先标记一下吧,往后走吧',
  '哦,我稍微理解了一丢丢,但我觉得应该不能说是完全理解',
  '能接受 这个完全理解的',
]);

const EXACT_UNCERTAIN_PROMPTS = new Set([
  '我不知道', '不知道', '不确定', '还没决定', '尚未决定',
  "i don't know", 'i do not know', 'not sure', 'unsure',
]);
const CHOICE_PROMPT_PATTERN = /^(?:[A-Z]|\d+|第?[一二三四五六七八九十]+(?:个|项)?|\d+(?:\s*[、,，.]\s*\d+)+)$/iu;

const CONTEXT_PATTERNS: ContextPattern[] = [
  {
    reason: 'understanding-state',
    pattern:
      /(?:不能|不敢)说(?:已经)?(?:完全)?(?:理解|懂|明白)|(?:还|暂时)?没(?:完全)?(?:理解|懂|明白)|(?:还|暂时|还是)?不(?:太|完全)?(?:理解|懂|明白)|(?:比刚刚|我|现在|目前|暂时|大概|基本|差不多|稍微|有点|有些|只|还)?(?:可以)?(?:理解|懂|明白)(?:一丢丢|一点点|一点|一些|了|些)?(?:了)?|(?:暂时)?(?:可以)?跟得?上|(?:暂时)?(?:可以)?接受(?:吧)?/giu,
  },
  {
    reason: 'deictic-reference',
    pattern:
      /(?:对)?(?:这个问题|这个|那个|这一个|那一个|这一点|这点|那点|这里|那里|这部分|那部分)(?:我)?(?:还是|还|有点|有些|暂时)?(?:有疑问|不太懂|不懂|没懂|不能理解|不理解|没理解)?|(?:原来|竟然)?是这样(?:啊|呀)?/giu,
  },
  {
    reason: 'temporary-note',
    pattern:
      /(?:这里|这个|这点)?(?:要)?(?:先|暂时)?(?:标记|记下|记住)(?:一下|这里|这个|这点)?|(?:以后|之后|回头)(?:再)?(?:回|来)?(?:讲|看|学|理解|讨论)|(?:先)?放一放/giu,
  },
  {
    reason: 'continuation',
    pattern:
      /(?:先|再|请|可以|暂时)?(?:继续|接着)(?:往下|下去|讲|说|聊|做|工作|进行|下一步|来)?(?:吧|一下)?|(?:继续)?往后走|(?:进入)?下一步|(?:然后|接下来)(?:呢|吧)?|(?:开始)?(?:做|工作)(?:吧)?|go\s+on|keep\s+going|continue(?:\s+please)?|what(?:'s|\s+s|\s+is)?\s+next|then\s+what|move\s+on|do\s+it|\bnext(?:\s+step)?\b/giu,
  },
  {
    reason: 'acknowledgement',
    pattern:
      /(?:嗯+|哦+|好(?:的)?|行|没问题|也?可以(?:的)?|当然|收到|知道了|明白了|懂了|接受|勉强|确实|原来如此)|\b(?:ok(?:ay)?|sure|yes|yep|yeah|fine|alright|got\s+it|understood|makes\s+sense)\b/giu,
  },
  {
    reason: 'understanding-state',
    pattern:
      /\b(?:i\s+)?(?:kind\s+of|sort\s+of|partly|mostly|roughly)?\s*(?:understand|follow)(?:\s+it)?(?:\s+(?:a\s+little|a\s+bit))?\b|\b(?:i\s+)?(?:do\s+not|don\s+t|cannot|can\s+t)\s+(?:fully\s+)?(?:understand|follow)(?:\s+(?:this|that|it))?\b/giu,
  },
  {
    reason: 'deictic-reference',
    pattern:
      /\b(?:this\s+point|that\s+point|this\s+part|that\s+part|this\s+issue|that\s+issue|this|that|it)(?:\s+is)?(?:\s+(?:still\s+)?(?:unclear|confusing))?\b/giu,
  },
  {
    reason: 'temporary-note',
    pattern:
      /\b(?:mark|note|bookmark)(?:\s+(?:this|that|it))?(?:\s+for\s+later)?\b|\bcome\s+back\s+to(?:\s+(?:this|that|it))?\s+later\b/giu,
  },
];

const GENERIC_HEADING_PATTERN = /^(?:(?:第\s*[一二三四五六七八九十百\d]+\s*(?:部分|章|节|点|步)\s*[:：-]?\s*)|(?:\d+(?:\.\d+)*\s*[.、:：-]?\s*))?(?:总结|小结|概述|概览|引言|回答|解答|分析|说明|正文|结论|下一步|后续步骤|继续|回顾|overview|summary|introduction|answer|response|analysis|explanation|conclusion|next\s+steps?|continue)$/iu;
const VAGUE_HEADING_PATTERN = /^(?:举个例子|我的建议|下面这点很重要|你真正想要的是什么|完全正确|不一定|(?:先|现在|接下来|下面)?(?:来)?(?:看|说|讲|讨论|分析|解释|回答|处理|做).*(?:最相关|比较新|这个|那个|这篇|这一|下一).*(?:论文|内容|问题|部分|步骤|事情))$/u;

/**
 * Classifies whether a prompt depends on surrounding context for navigation.
 * The integer score counts matched signal families; it is not a probability.
 */
export function classifyPromptForSmartLabel(text: string): PromptLabelDecision {
  const normalizedText = normalizeTrigger(text);
  if (!normalizedText) {
    return createDecision(false, normalizedText, '', 0, ['empty'], 'unknown');
  }
  if (hasProtectedContent(text)) {
    return createDecision(false, normalizedText, normalizedText, 0, ['protected-content'], 'informative');
  }
  if (EXACT_UNCERTAIN_PROMPTS.has(normalizedText)) {
    return createDecision(true, normalizedText, '', 2, ['exact-trigger'], 'uncertain');
  }
  if (CHOICE_PROMPT_PATTERN.test(normalizedText)) {
    return createDecision(true, normalizedText, '', 2, ['exact-trigger'], 'choice');
  }
  if (EXACT_LOW_INFORMATION_PROMPTS.has(normalizedText)) {
    return createDecision(true, normalizedText, '', 2, ['exact-trigger'], inferReplyType(normalizedText));
  }

  let remainder = normalizeForFragmentMatching(text);
  const matchedReasons = new Set<PromptLabelReason>();
  for (const { reason, pattern } of CONTEXT_PATTERNS) {
    const nextRemainder = remainder.replace(pattern, ' ');
    if (nextRemainder !== remainder) matchedReasons.add(reason);
    remainder = nextRemainder;
  }
  remainder = cleanRemainder(remainder);

  const reasons = [...matchedReasons];
  if (remainder) reasons.push('meaningful-remainder');
  const score = matchedReasons.size;
  const isLowInformation = score > 0 && !remainder;
  return createDecision(
    isLowInformation,
    normalizedText,
    remainder,
    score,
    reasons,
    isLowInformation ? inferReplyType(normalizedText, reasons) : score > 0 ? 'unknown' : 'informative'
  );
}

/** Returns whether a prompt is conservatively classified as context-dependent. */
export function isLowInformationPrompt(text: string): boolean {
  return classifyPromptForSmartLabel(text).isLowInformation;
}

/**
 * Resolves Raw/Smart display metadata without changing the source prompt.
 * A cached label wins only for prompts that still qualify for Smart labeling.
 */
export function resolvePromptDisplayLabel(
  input: PromptDisplayLabelInput
): PromptDisplayLabelResult {
  const rawLabel = normalizeDisplayText(input.rawText);
  const decision = classifyPromptForSmartLabel(input.rawText);
  const compression = compressPromptLabel(rawLabel);
  const completionNeed: PromptLabelNeed = decision.isLowInformation ? 'yes' : 'no';
  const compressionNeed: PromptLabelNeed = compression.needed ? 'yes' : 'no';
  const baseStages = createStageStatuses();

  if (input.mode === 'raw') {
    return createDisplayResult(rawLabel, rawLabel, decision, {
      completionNeed,
      compressionNeed,
      route: 'keep',
      primaryReason: 'MODE_RAW',
      stages: baseStages,
    });
  }

  if (input.cachedLabel && (decision.isLowInformation || compression.needed)) {
    const route: PromptLabelRoute = decision.isLowInformation
      ? 'complete'
      : 'compress';
    const cachedEvidence = extractResponseLabelCandidates(input.currentResponses ?? [])
      .find((candidate) => candidate.text === input.cachedLabel);
    const contextual = createContextualResult(
      cachedEvidence ? [cachedEvidence] : [],
      decision.replyType
    );
    return createDisplayResult(input.cachedLabel, input.cachedLabel, decision, {
      completionNeed,
      compressionNeed,
      route,
      primaryReason: 'CACHE_HIT',
      stages: { ...baseStages, classify: 'passed' },
      contextual,
      cacheStatus: 'hit',
    });
  }

  if (!decision.isLowInformation) {
    if (compression.outcome === 'compressed') {
      return createDisplayResult(compression.selectedLabel, compression.selectedLabel, decision, {
        completionNeed,
        compressionNeed,
        route: 'compress',
        primaryReason: 'LABEL_ACCEPTED',
        stages: { ...baseStages, classify: 'passed', compression: 'passed' },
        shouldStore: true,
        decisionType: 'compress',
      });
    }
    return createDisplayResult(rawLabel, rawLabel, decision, {
      completionNeed,
      compressionNeed,
      route: compression.needed ? 'abstain' : 'keep',
      primaryReason: compression.needed ? 'COMPRESSION_LOSS' : 'RAW_ALREADY_USEFUL',
      stages: {
        ...baseStages,
        classify: 'passed',
        compression: compression.needed ? 'rejected' : 'not_run',
      },
    });
  }

  if (!input.hasResponse) {
    return createDisplayResult(rawLabel, rawLabel, decision, {
      completionNeed,
      compressionNeed,
      route: 'abstain',
      primaryReason: 'CONTEXT_MISSING',
      stages: { ...baseStages, classify: 'passed', evidence: 'rejected' },
    });
  }
  if (input.sourceComplete === false) {
    return createDisplayResult(rawLabel, rawLabel, decision, {
      completionNeed,
      compressionNeed,
      route: 'abstain',
      primaryReason: 'SOURCE_INCOMPLETE',
      stages: { ...baseStages, classify: 'passed', evidence: 'deferred' },
    });
  }

  const contextual = resolveContextualLabel(input, decision);
  if (!contextual.selected) {
    const primaryReason = contextual.candidateCount > 0
      ? 'NO_VALID_CANDIDATES'
      : 'NO_CANDIDATES';
    return createDisplayResult(rawLabel, rawLabel, decision, {
      completionNeed,
      compressionNeed,
      route: 'abstain',
      primaryReason,
      stages: {
        ...baseStages,
        classify: 'passed',
        evidence: contextual.evidenceCount > 0 ? 'passed' : 'rejected',
        candidates: contextual.candidateCount > 0 ? 'passed' : 'rejected',
        guards: contextual.candidateCount > 0 ? 'rejected' : 'not_run',
      },
      contextual,
    });
  }

  const completedLabel = contextual.selected.text;
  const completedCompression = compressPromptLabel(completedLabel);
  const label = completedCompression.selectedLabel;
  const cacheReason = input.cacheStatus === 'unverifiable'
    ? 'CACHE_UNVERIFIABLE'
    : input.cacheStatus === 'stale'
      ? 'CACHE_STALE'
      : 'CACHE_MISS';
  return createDisplayResult(label, label, decision, {
    completionNeed,
    compressionNeed: completedCompression.needed ? 'yes' : 'no',
    route: completedCompression.outcome === 'compressed' ? 'complete_then_compress' : 'complete',
    primaryReason: 'LABEL_ACCEPTED',
    allReasons: ['LABEL_ACCEPTED', cacheReason],
    cacheStatus: input.cacheStatus,
    stages: {
      ...baseStages,
      classify: 'passed',
      evidence: 'passed',
      candidates: 'passed',
      guards: 'passed',
      compression: completedCompression.needed
        ? completedCompression.outcome === 'compressed' ? 'passed' : 'rejected'
        : 'not_run',
    },
    shouldStore: label !== rawLabel,
    decisionType: decision.replyType,
    contextual,
  });
}

/** Builds a Smart Label while retaining compatibility with pure callers. */
export function createSmartPromptLabel(
  prompt: PromptLabelInput,
  answerHeading?: string | null
): string {
  return resolvePromptDisplayLabel({
    rawText: prompt.text,
    mode: 'smart',
    answerHeading,
    hasResponse: Boolean(answerHeading),
  }).label;
}

/** Extracts the first reliable Markdown heading near the start of a response. */
export function extractFirstMarkdownHeading(
  responses: PromptLabelInput[]
): string | null {
  let scannedCharacters = 0;
  let scannedLines = 0;

  for (const response of responses) {
    let fenceMarker: '```' | '~~~' | null = null;
    for (const line of response.text.split(/\r?\n/)) {
      scannedCharacters += line.length + 1;
      scannedLines += 1;
      if (scannedCharacters > MAX_HEADING_SCAN_CHARACTERS || scannedLines > MAX_HEADING_SCAN_LINES) {
        return null;
      }

      const trimmedLine = line.trim();
      const nextFence = trimmedLine.startsWith('```')
        ? '```'
        : trimmedLine.startsWith('~~~')
          ? '~~~'
          : null;
      if (nextFence) {
        if (!fenceMarker) fenceMarker = nextFence;
        else if (fenceMarker === nextFence) fenceMarker = null;
        continue;
      }
      if (fenceMarker) continue;

      const match = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
      if (!match) continue;
      const heading = cleanLabelMarkdown(match[1]);
      if (isReliableHeading(heading)) return heading;
    }
  }
  return null;
}

/** Returns whether a cleaned heading is specific enough to replace a prompt. */
export function isReliableHeading(heading: string): boolean {
  const normalizedHeading = normalizeDisplayText(heading);
  if (!normalizedHeading || normalizedHeading.length > MAX_SEMANTIC_LABEL_LENGTH) return false;
  if (
    GENERIC_HEADING_PATTERN.test(normalizedHeading) ||
    VAGUE_HEADING_PATTERN.test(normalizedHeading) ||
    isLowInformationPrompt(normalizedHeading)
  ) {
    return false;
  }

  const words = normalizedHeading.match(/[\p{L}\p{N}]+/gu) ?? [];
  const hanCharacters = normalizedHeading.match(/\p{Script=Han}/gu) ?? [];
  return hanCharacters.length >= 2 || words.length >= 2;
}

function createDecision(
  isLowInformation: boolean,
  normalizedText: string,
  remainder: string,
  score: number,
  reasons: PromptLabelReason[],
  replyType: PromptReplyType
): PromptLabelDecision {
  return { isLowInformation, normalizedText, remainder, score, reasons, replyType };
}

function hasProtectedContent(text: string): boolean {
  return /```|~~~|`[^`]+`|https?:\/\/|\[(?:file|image|文件|图片)\]|<[^>]+>/iu.test(text);
}

function normalizeForFragmentMatching(text: string): string {
  return normalizeDisplayText(text.normalize('NFKC'))
    .toLocaleLowerCase()
    .replace(/[.!?。！？…，,；;：:、~～()（）“”"'’]+/gu, ' ');
}

function cleanRemainder(text: string): string {
  return text
    .replace(/(?:^|\s)(?:但是|但|不过|而且|并且|所以|那么|那|也|还|就|先|再|请|吧|啊|呀|呢|哦|哈|啦|了|的|我|我们|一下|现在|目前|暂时|要|for\s+now|but|and|so|then|please|yet|still)(?=\s|$)/giu, ' ')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTrigger(text: string): string {
  return normalizeDisplayText(text.normalize('NFKC'))
    .toLocaleLowerCase()
    .replace(/[.!?。！？…，,；;：:、~～]+$/u, '')
    .trim();
}

function normalizeDisplayText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function inferReplyType(
  text: string,
  reasons: PromptLabelReason[] = []
): PromptReplyType {
  if (/^(?:为什么|why)/iu.test(text) || reasons.includes('deictic-reference')) return 'clarify';
  if (/^(?:做吧|开始(?:做|工作)|可以\s*工作吧|do\s+it|okay,?\s+do\s+it)$/iu.test(text)) {
    return 'authorize';
  }
  if (reasons.includes('continuation') || /(?:继续|接着|下一步|then|next|go on)/iu.test(text)) return 'continue';
  return 'acknowledge';
}

function resolveContextualLabel(
  input: PromptDisplayLabelInput,
  decision: PromptLabelDecision
): ContextualLabelResult {
  const currentResponses = input.currentResponses ?? [];
  const previousResponses = input.previousResponses ?? [];

  if (decision.replyType === 'choice') {
    const selected = resolveChoiceLabel(decision.normalizedText, previousResponses);
    return createContextualResult(selected ? [selected] : [], decision.replyType);
  }
  if (decision.replyType === 'uncertain') {
    const selected = resolveUncertainLabel(previousResponses);
    return createContextualResult(selected ? [selected] : [], decision.replyType);
  }

  const candidates = [
    ...extractResponseLabelCandidates(currentResponses),
    ...extractPromptTaskCandidates(input.previousPrompt ? [input.previousPrompt] : []),
  ];
  const compatibleHeading = normalizeDisplayText(input.answerHeading ?? '');
  if (
    isReliableHeading(compatibleHeading) &&
    !candidates.some((candidate) => candidate.text === compatibleHeading)
  ) {
    candidates.push({
      id: `response-heading:${currentResponses[0]?.id ?? 'unknown'}:0:0`,
      kind: 'response-heading',
      text: compatibleHeading,
      sourceMessageId: currentResponses[0]?.id,
      sourceStart: 0,
      sourceEnd: 0,
      contextTruncated: false,
    });
  }

  if (decision.replyType === 'clarify') {
    const question = extractPreviousQuestion(previousResponses);
    if (question) candidates.push({ ...question, text: `继续理解：${question.text}` });
  }

  const reliableCandidates = candidates.filter((candidate) => isReliableHeading(candidate.text));
  const focus = resolvePromptLabelFocus(decision.replyType, reliableCandidates);
  return {
    selected: focus.selected,
    candidates,
    validCandidates: focus.validCandidates,
    evidenceCount: new Set(candidates.map((candidate) => candidate.sourceMessageId).filter(Boolean)).size,
    candidateCount: candidates.length,
    focusFrame: focus.frame,
  };
}

function resolveChoiceLabel(
  rawChoice: string,
  previousResponses: PromptLabelInput[]
): PromptLabelCandidate | null {
  const keys = rawChoice.match(/[A-Z]|\d+/giu)?.map((key) => key.toLocaleUpperCase()) ?? [];
  if (!keys.length) return null;
  const matchingGroups = extractPreviousOptionGroups(previousResponses).filter((group) =>
    Boolean(group.question) && keys.every((key) => group.options.has(key))
  );
  if (matchingGroups.length !== 1) return null;
  const evidence = matchingGroups[0].options.get(keys[0]);
  const selectedText = keys.map((key) => matchingGroups[0].options.get(key)?.text ?? '');
  const text = `选择 ${keys.join('、')}：${selectedText.join('；')}`;
  return evidence && isReliableHeading(text) ? { ...evidence, text } : null;
}

function resolveUncertainLabel(previousResponses: PromptLabelInput[]): PromptLabelCandidate | null {
  const groups = extractPreviousOptionGroups(previousResponses);
  if (groups.length === 1 && groups[0].question) {
    const options = [...groups[0].options.values()].map((option) => option.text);
    const subject = options.length === 2 ? options.join('还是') : groups[0].question;
    if (subject) {
      const text = `尚未决定：${subject}`;
      const evidence = groups[0].options.values().next().value as PromptLabelCandidate | undefined;
      return evidence && isReliableHeading(text) ? { ...evidence, text } : null;
    }
  }
  const question = extractPreviousQuestion(previousResponses);
  if (!question) return null;
  const text = `不确定：${question.text}`;
  return isReliableHeading(text) ? { ...question, text } : null;
}

function createContextualResult(
  candidates: PromptLabelCandidate[],
  replyType: PromptReplyType
): ContextualLabelResult {
  const focus = resolvePromptLabelFocus(replyType, candidates);
  return {
    selected: focus.selected,
    candidates,
    validCandidates: focus.validCandidates,
    evidenceCount: new Set(candidates.map((candidate) => candidate.sourceMessageId).filter(Boolean)).size,
    candidateCount: candidates.length,
    focusFrame: focus.frame,
  };
}

interface ContextualLabelResult {
  selected: PromptLabelCandidate | null;
  candidates: PromptLabelCandidate[];
  validCandidates: PromptLabelCandidate[];
  evidenceCount: number;
  candidateCount: number;
  focusFrame: PromptLabelFocusFrame;
}

function createStageStatuses(): PromptLabelStageStatuses {
  return {
    classify: 'not_run',
    evidence: 'not_run',
    candidates: 'not_run',
    guards: 'not_run',
    compression: 'not_run',
    layout: 'not_run',
  };
}

function createDisplayResult(
  label: string,
  semanticLabel: string,
  decision: PromptLabelDecision,
  options: {
    completionNeed: PromptLabelNeed;
    compressionNeed: PromptLabelNeed;
    route: PromptLabelRoute;
    primaryReason: PromptLabelReasonCode;
    allReasons?: PromptLabelReasonCode[];
    stages: PromptLabelStageStatuses;
    shouldStore?: boolean;
    decisionType?: string;
    contextual?: ContextualLabelResult;
    cacheStatus?: PromptDisplayLabelResult['cacheStatus'];
  }
): PromptDisplayLabelResult {
  const contextual = options.contextual;
  return {
    label,
    semanticLabel,
    shouldStore: options.shouldStore ?? false,
    decision,
    decisionType: options.decisionType,
    completionNeed: options.completionNeed,
    compressionNeed: options.compressionNeed,
    route: options.route,
    primaryReason: options.primaryReason,
    allReasons: options.allReasons ?? [options.primaryReason],
    stageStatuses: options.stages,
    evidenceCount: contextual?.evidenceCount ?? 0,
    candidateCount: contextual?.candidateCount ?? 0,
    validCandidateCount: contextual?.validCandidates.length ?? 0,
    selectedCandidate: contextual?.selected ?? undefined,
    focusFrame: contextual?.focusFrame,
    contextTruncated: contextual?.candidates.some((candidate) => candidate.contextTruncated) ?? false,
    sourceKinds: [...new Set(contextual?.candidates.map((candidate) => candidate.kind) ?? [])],
    cacheStatus: options.cacheStatus ?? (options.primaryReason === 'CACHE_HIT'
      ? 'hit'
      : options.primaryReason === 'CACHE_UNVERIFIABLE'
        ? 'unverifiable'
        : options.primaryReason === 'CACHE_STALE'
          ? 'stale'
          : 'miss'),
    elapsedMs: 0,
  };
}
