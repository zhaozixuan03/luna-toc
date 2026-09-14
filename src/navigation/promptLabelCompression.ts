/** Compresses long labels while preserving task-defining constraints. */

export interface PromptLabelCompressionResult {
  needed: boolean;
  characterCount: number;
  semanticLabel: string;
  candidates: string[];
  selectedLabel: string;
  outcome: 'not_needed' | 'compressed' | 'lossy_rejected';
}

export const PROMPT_COMPRESSION_CHARACTER_LIMIT = 48;
const ACTION_PATTERN = /(?:请|帮我|需要|排查|修复|修改|改为|改成|增加|新增|添加|生成|整理|制作|写|比较|分析|实现|设计|压缩|回复|调整|保留|不要|避免|查找|总结|解释|翻译|add|export|write|create|build|make|revise|compare|analy[sz]e|fix|implement|design|summari[sz]e|translate)/iu;

/** Counts normalized Unicode code points without consulting browser layout. */
export function countPromptContentCharacters(label: string): number {
  return Array.from(normalize(label)).length;
}

/** Returns whether a label merits semantic compression from content length alone. */
export function assessPromptCompressionNeed(label: string): boolean {
  return countPromptContentCharacters(label) > PROMPT_COMPRESSION_CHARACTER_LIMIT;
}

/** Produces ordered, fidelity-checked label candidates without truncating text. */
export function compressPromptLabel(
  label: string,
  force = false
): PromptLabelCompressionResult {
  const semanticLabel = normalize(label);
  const characterCount = countPromptContentCharacters(semanticLabel);
  const needed = force || assessPromptCompressionNeed(semanticLabel);
  if (!needed) {
    return {
      needed: false,
      characterCount,
      semanticLabel,
      candidates: [semanticLabel],
      selectedLabel: semanticLabel,
      outcome: 'not_needed',
    };
  }

  const generated = [compactWording(semanticLabel), extractTaskClauses(semanticLabel)]
    .map(normalize)
    .filter((candidate) => candidate && candidate !== semanticLabel)
    .filter((candidate) => countPromptContentCharacters(candidate) < characterCount)
    .filter((candidate) => preservesCriticalMeaning(semanticLabel, candidate));
  const candidates = [...new Set([semanticLabel, ...generated])];
  const selectedLabel = generated.reduce<string | undefined>((shortest, candidate) => {
    if (!shortest) return candidate;
    return countPromptContentCharacters(candidate) < countPromptContentCharacters(shortest)
      ? candidate
      : shortest;
  }, undefined);
  return {
    needed,
    characterCount,
    semanticLabel,
    candidates,
    selectedLabel: selectedLabel ?? semanticLabel,
    outcome: selectedLabel ? 'compressed' : 'lossy_rejected',
  };
}

/** Checks numbers, units, negation targets, and explicit alternatives. */
export function preservesCriticalMeaning(source: string, candidate: string): boolean {
  const normalizedSource = normalize(source).toLocaleLowerCase();
  const normalizedCandidate = normalize(candidate).toLocaleLowerCase();
  const protectedTokens = normalizedSource.match(
    /\bv?\d+(?:\.\d+){1,}\b|\d+(?:\.\d+)?\s*(?:khz|mhz|ghz|hz|ms|s|fps|kbps|mbps|gbps|kb|mb|gb|tb|px|%|倍|页)?|\b(?:pdf|latex|cv|json|csv|docx|svg|p\d+)\b/giu
  ) ?? [];
  if (protectedTokens.some((token) => !normalizedCandidate.includes(normalize(token).toLocaleLowerCase()))) {
    return false;
  }
  const protectedLiterals = source.match(/https?:\/\/[^\s)]+|`[^`]+`|\[(?:file|image|文件|图片)\]/giu) ?? [];
  if (protectedLiterals.some((literal) => !candidate.includes(literal))) return false;

  const negativeTargets = [...normalizedSource.matchAll(/(?:不要|不能|不可|避免|不得)\s*(?:说|改|删除|忽略|省略|写)?\s*([^，,。；;但]{2,40})/gu)]
    .map((match) => normalize(match[1]));
  negativeTargets.push(
    ...[...normalizedSource.matchAll(/\b(?:do\s+not|don't|must\s+not|never|without|avoid)\s+([^,.;]{2,80})/giu)]
      .map((match) => normalize(match[1]))
  );
  if (negativeTargets.some((target) => !normalizedCandidate.includes(target))) return false;
  if (negativeTargets.length > 0 && !/(?:不|避免|保留|禁止|不可|do\s+not|don't|must\s+not|never|without|avoid|keep)/iu.test(candidate)) {
    return false;
  }

  if (/(?:还是|或|或者|与|和|compare|versus|\bvs\.?\b)/iu.test(source)) {
    const namedTerms = (source.match(/\b[A-Z][A-Za-z0-9+./-]*\b/g) ?? [])
      .filter((term) => !/^(?:please|could|would|can)$/iu.test(term));
    if (namedTerms.some((term) => !candidate.includes(term))) return false;
  }
  return true;
}

function compactWording(source: string): string {
  return source
    .replace(/^(?:could|would|can)\s+you\s+(?:please\s+)?|^please\s+/iu, '')
    .replace(/^(?:请问|麻烦|能不能|可不可以|可以请你|请你|请|麻烦你|我希望你|我想让你|帮我)\s*/u, '')
    .replace(/^将(.+?)措辞改为/u, '修改$1：')
    .replace(/^把(.+?)从\s*([^，,]+?)\s*改为\s*/u, '$1改为 ')
    .replace(/(?:但|但是|同时)?\s*不要改\s*/gu, '，保留')
    .replace(/(?:但|但是|同时)?\s*不要说\s*/gu, '，避免')
    .replace(/(?:但|但是|同时)?\s*(?:也)?不要\s*/gu, '，不要')
    .replace(/(?:仍然|仍需|仍要)\s*/gu, '')
    .replace(/(?:请)?(?:帮我)?(?:进行|完成|一下|一遍)/gu, '')
    .replace(/\bplease\b[,:]?\s*/giu, '')
    .replace(/[，,]\s*[，,]+/gu, '，')
    .replace(/[；;]\s*[；;]+/gu, '；')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTaskClauses(source: string): string {
  const clauses = source
    .split(/(?<=[。！？!?；;])|\n+/u)
    .map(normalize)
    .filter(Boolean);
  const taskClauses = clauses.filter((clause) => ACTION_PATTERN.test(clause));
  if (!taskClauses.length) return compactWording(source);
  return compactWording(
    taskClauses
      .map((clause) => clause.replace(/[。！？!?；;]+$/u, ''))
      .join('；')
  );
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
