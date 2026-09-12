/** Extracts bounded, source-backed context for deterministic Smart Labels. */

import type { PromptLabelInput } from './promptLabels';

export type PromptLabelCandidateKind =
  | 'response-heading'
  | 'response-topic'
  | 'response-task'
  | 'prompt-task'
  | 'previous-question'
  | 'previous-option';

export interface PromptLabelCandidate {
  id: string;
  kind: PromptLabelCandidateKind;
  text: string;
  sourceMessageId?: string;
  sourceStart: number;
  sourceEnd: number;
  contextTruncated: boolean;
}

export interface PromptOptionGroup {
  question: string | null;
  options: Map<string, PromptLabelCandidate>;
}

interface JoinedSourceSegment {
  messageId?: string;
  combinedStart: number;
  combinedEnd: number;
  sourceStart: number;
}

interface JoinedSource {
  text: string;
  segments: JoinedSourceSegment[];
  truncated: boolean;
}

interface SourceLine {
  text: string;
  start: number;
  end: number;
}

const CHARACTER_BUDGET = 4_096;
const TASK_ACTION_PATTERN = /(?:确认|采用|使用|整理|制作|生成|撰写|修改|改成|改为|比较|分析|排查|修复|实现|设计|收口|收成|转成|做成|开始做|继续做|继续整理|继续制作|export|write|create|build|make|revise|compare|analy[sz]e|fix|implement|design)/iu;

/** Extracts headings, introduced topics, and task-bearing sentences from answers. */
export function extractResponseLabelCandidates(
  responses: PromptLabelInput[]
): PromptLabelCandidate[] {
  const candidates: PromptLabelCandidate[] = [];
  let remainingBudget = CHARACTER_BUDGET;
  const contextTruncated = responses.reduce((total, response) => total + response.text.length, 0) > CHARACTER_BUDGET;

  for (const response of responses) {
    if (remainingBudget <= 0) break;
    const source = response.text.slice(0, remainingBudget);
    const truncated = contextTruncated || source.length < response.text.length;
    remainingBudget -= source.length;
    let inFence = false;

    for (const line of iterateSourceLines(source)) {
      const trimmed = line.text.trim();
      if (/^(?:```|~~~)/.test(trimmed)) {
        inFence = !inFence;
        continue;
      }
      if (inFence || !trimmed) continue;

      const heading = trimmed.match(/^#{1,6}\s+(.+?)\s*#*$/);
      const introducedTopic = trimmed.match(
        /^(?:这一(?:小节|部分|段)|接下来|下面)(?:就|只|会|将)?(?:专门|主要)?(?:用|来)?(?:讲|解释|讨论|比较|看|处理)\s*[：:]?\s*(.+)$/u
      );
      const leadingBold = trimmed.match(/^\*\*(.+?)\*\*[。.!！?？]?$/u);
      const openingTopic = line.start < 600
        ? trimmed.match(/^(?:你(?:这个|这里)?问得(?:非常|很)?好|直接回答|核心问题)\s*[：:]\s*(.+)$/u)
        : null;
      const rawTopic = heading?.[1] ?? introducedTopic?.[1] ?? leadingBold?.[1] ?? openingTopic?.[1];
      if (rawTopic) {
        addCandidate(candidates, heading ? 'response-heading' : 'response-topic', rawTopic, response.id, line, truncated);
      }

      const taskLabel = extractTaskLabel(trimmed);
      if (taskLabel) addCandidate(candidates, 'response-task', taskLabel, response.id, line, truncated);
    }
  }
  return deduplicateCandidates(candidates);
}

/** Extracts compact task candidates from explicit user requests. */
export function extractPromptTaskCandidates(
  prompts: PromptLabelInput[]
): PromptLabelCandidate[] {
  return prompts.flatMap((prompt) => {
    const source = prompt.text.slice(0, CHARACTER_BUDGET);
    const truncated = source.length < prompt.text.length;
    const candidates: PromptLabelCandidate[] = [];
    iterateSourceLines(source).forEach((line) => {
      const taskLabel = extractTaskLabel(line.text.trim());
      if (taskLabel) addCandidate(candidates, 'prompt-task', taskLabel, prompt.id, line, truncated);
    });
    return candidates;
  });
}

/** Extracts complete option groups from the bounded end of the preceding answer. */
export function extractPreviousOptionGroups(
  responses: PromptLabelInput[]
): PromptOptionGroup[] {
  const source = joinResponseTail(responses, CHARACTER_BUDGET);
  const groups: PromptOptionGroup[] = [];
  let options = new Map<string, PromptLabelCandidate>();
  let question: string | null = null;
  let pendingKey: string | null = null;
  let pendingStart = 0;

  const finishGroup = (): void => {
    if (options.size >= 2) groups.push({ question, options });
    options = new Map();
    question = null;
    pendingKey = null;
  };

  for (const line of iterateSourceLines(source.text)) {
    const trimmed = line.text.trim();
    const inline = trimmed.match(/^(?:#{1,6}\s*)?([A-Z]|\d+)\s*[.、:：)]\s*(.+)$/iu);
    const standalone = trimmed.match(/^#{1,6}\s*([A-Z]|\d+)\s*[.、:：)]?$/iu);
    if (inline) {
      const key = inline[1].toLocaleUpperCase();
      if (options.has(key)) finishGroup();
      if (!question) question = findNearestQuestion(line.start, source.text);
      options.set(key, createMappedCandidate(source, 'previous-option', cleanLabelMarkdown(inline[2]), line.start, line.end));
      pendingKey = null;
    } else if (standalone) {
      pendingKey = standalone[1].toLocaleUpperCase();
      pendingStart = line.start;
      if (!question) question = findNearestQuestion(line.start, source.text);
    } else if (pendingKey && trimmed) {
      if (options.has(pendingKey)) finishGroup();
      options.set(pendingKey, createMappedCandidate(source, 'previous-option', cleanLabelMarkdown(trimmed), pendingStart, line.end));
      pendingKey = null;
    } else if (options.size > 0 && trimmed && /[?？]$/u.test(trimmed)) {
      finishGroup();
    }
  }
  finishGroup();
  return groups;
}

/** Returns the last explicit question from the bounded preceding answer. */
export function extractPreviousQuestion(
  responses: PromptLabelInput[]
): PromptLabelCandidate | null {
  const source = joinResponseTail(responses, CHARACTER_BUDGET);
  const matches = [...source.text.matchAll(/([^\n\r。！？?]{4,160}[？?])/gu)];
  const match = matches.at(-1);
  if (!match || match.index === undefined) return null;
  const text = cleanLabelMarkdown(match[1]);
  return text
    ? createMappedCandidate(source, 'previous-question', text, match.index, match.index + match[0].length)
    : null;
}

/** Creates a compact signature for every context source read by the resolver. */
export function createPromptLabelSourceSignature(
  previousResponses: PromptLabelInput[],
  currentResponses: PromptLabelInput[],
  promptText = '',
  previousPrompt?: PromptLabelInput | null
): string {
  const source = `${promptText}\u0002${previousPrompt?.id ?? ''}\u0000${previousPrompt?.text ?? ''}\u0002${[
    ...previousResponses,
    ...currentResponses,
  ].map((response) => `${response.id ?? ''}\u0000${response.text}`).join('\u0001')}`;
  let hash = 2_166_136_261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `4:${source.length}:${(hash >>> 0).toString(16)}`;
}

/** Conservatively removes display-only Markdown while preserving identifiers. */
export function cleanLabelMarkdown(value: string): string {
  const hasReadableHanText = (value.match(/\p{Script=Han}/gu) ?? []).length >= 4;
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\\\((.+?)\\\)|\$(.+?)\$/g, (match) => hasReadableHanText ? '' : normalizeLatex(match))
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g, '$1$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+([，。！？、；：,.!?;:])/gu, '$1')
    .replace(/(\p{Script=Han})\s+(?=\p{Script=Han})/gu, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTaskLabel(line: string): string | null {
  if (!TASK_ACTION_PATTERN.test(line)) return null;
  const emphasized = [...line.matchAll(/\*\*(.+?)\*\*/g)]
    .map((match) => cleanLabelMarkdown(match[1]))
    .filter((text) => text && !/^(?:\d+\s*(?:条|个|项|点|页)|正文|下一步|这个版本)$/u.test(text));
  const normalized = cleanLabelMarkdown(line)
    .replace(/^(?:好(?:的)?|嗯+|可以|没问题)[，,：:\s]*/u, '')
    .replace(/^(?:我)?(?:下一步|接下来|现在)(?:就|会|将)?/u, '')
    .replace(/^(?:已经)?(?:转到\s*Work\s*里)?(?:开始)?/iu, '')
    .replace(/(?:了|吧)[。.!！]?$/u, '')
    .trim();
  if (emphasized.length > 0) {
    const objects = [...new Set(emphasized)].join(' 与 ');
    const negativeAction = line.match(/(?:不|别|暂不|无需|不要)(?:建议)?(?:再)?(制作|生成|修改|选择|采用|实现|继续)/u);
    if (negativeAction) {
      return `暂不${negativeAction[1]}${startsLatin(objects) ? ' ' : ''}${objects}`;
    }
    if (/^(?:好(?:的)?[，,：:\s]*)?(?:那我们|我们)?(?:就)?(?:确认|定)/u.test(line)) {
      return `确认${startsLatin(objects) ? ' ' : ''}${objects}`;
    }
    if (/(?:整理|收口|收成)/u.test(line) && !/(?:做成|制作|开始做)/u.test(line)) return `整理${startsLatin(objects) ? ' ' : ''}${objects}`;
    return `制作${startsLatin(objects) ? ' ' : ''}${objects}`;
  }
  if (normalized.length < 8) return null;
  return normalized;
}

function startsLatin(value: string): boolean {
  return /^[A-Za-z0-9]/u.test(value);
}

function addCandidate(
  candidates: PromptLabelCandidate[],
  kind: PromptLabelCandidateKind,
  rawText: string,
  messageId: string | undefined,
  line: SourceLine,
  truncated: boolean
): void {
  const text = cleanLabelMarkdown(rawText);
  if (!text) return;
  candidates.push({
    id: `${kind}:${messageId ?? 'unknown'}:${line.start}:${line.end}`,
    kind,
    text,
    sourceMessageId: messageId,
    sourceStart: line.start,
    sourceEnd: line.end,
    contextTruncated: truncated,
  });
}

function deduplicateCandidates(candidates: PromptLabelCandidate[]): PromptLabelCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.kind}\u0000${candidate.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createMappedCandidate(
  source: JoinedSource,
  kind: PromptLabelCandidateKind,
  text: string,
  start: number,
  end: number
): PromptLabelCandidate {
  const segment = source.segments.find((candidate) => start >= candidate.combinedStart && start < candidate.combinedEnd);
  const sourceStart = (segment?.sourceStart ?? 0) + (segment ? start - segment.combinedStart : start);
  const sourceEnd = (segment?.sourceStart ?? 0) + (segment ? Math.min(end, segment.combinedEnd) - segment.combinedStart : end);
  return {
    id: `${kind}:${segment?.messageId ?? 'unknown'}:${sourceStart}:${sourceEnd}`,
    kind,
    text,
    sourceMessageId: segment?.messageId,
    sourceStart,
    sourceEnd,
    contextTruncated: source.truncated,
  };
}

function joinResponseTail(responses: PromptLabelInput[], budget: number): JoinedSource {
  const selected: Array<{ response: PromptLabelInput; text: string; sourceStart: number }> = [];
  let remaining = budget;
  for (let index = responses.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const response = responses[index];
    const take = Math.min(response.text.length, remaining);
    selected.unshift({ response, text: response.text.slice(-take), sourceStart: response.text.length - take });
    remaining -= take;
  }
  let text = '';
  const segments: JoinedSourceSegment[] = [];
  selected.forEach((entry, index) => {
    if (index > 0) text += '\n';
    const combinedStart = text.length;
    text += entry.text;
    segments.push({ messageId: entry.response.id, combinedStart, combinedEnd: text.length, sourceStart: entry.sourceStart });
  });
  const totalLength = responses.reduce((sum, response) => sum + response.text.length, 0);
  return { text, segments, truncated: totalLength > budget };
}

function iterateSourceLines(source: string): SourceLine[] {
  const lines: SourceLine[] = [];
  for (const match of source.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)) {
    if (match.index === undefined || (!match[0] && match.index === source.length)) continue;
    const text = match[0].replace(/(?:\r\n|\r|\n)$/u, '');
    lines.push({ text, start: match.index, end: match.index + text.length });
  }
  return lines;
}

function findNearestQuestion(offset: number, source: string): string | null {
  const precedingLines = iterateSourceLines(source.slice(0, offset));
  for (let index = precedingLines.length - 1; index >= 0; index -= 1) {
    const text = cleanLabelMarkdown(precedingLines[index].text);
    if (/[?？]$/u.test(text) || /(?:还是|选择|哪个|哪一)/u.test(text)) return text;
  }
  return null;
}

function normalizeLatex(value: string): string {
  return value
    .replace(/^\\\(|\\\)$/g, '')
    .replace(/^\$|\$$/g, '')
    .replace(/\\(?:mathrm|text)\{([^}]*)\}/g, '$1')
    .replace(/_\{([^}]*)\}/g, '_$1')
    .replace(/[{}]/g, '')
    .trim();
}
