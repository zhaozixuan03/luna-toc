/** Replays audited Smart Label fixtures for local developer evaluation. */
const resolverModulePath = '../src/navigation/promptLabels.ts';
const compressionModulePath = '../src/navigation/promptLabelCompression.ts';
const shortFixtureModulePath = '../test/fixtures/smartLabels/auditedShortPrompts.ts';
const longFixtureModulePath = '../test/fixtures/smartLabels/auditedLongPrompts.ts';

interface ShortEvaluationFixture {
  caseId: string;
  rawText: string;
  previousPrompt: string;
  currentResponse: string;
  allowedLabels: string[];
  forbiddenTerms: string[];
}
interface LongEvaluationFixture {
  caseId: string;
  rawText: string;
  requiredTerms: string[];
  forbiddenTerms: string[];
  expectCompression: boolean;
}
interface EvaluationResult {
  label: string;
  semanticLabel: string;
  completionNeed: string;
  compressionNeed: string;
  route: string;
  candidateCount: number;
  validCandidateCount: number;
  primaryReason: string;
}
interface CompressionResult {
  characterCount: number;
  candidates: string[];
}
type ResolveLabel = (input: Record<string, unknown>) => EvaluationResult;
type CompressLabel = (label: string) => CompressionResult;

const resolverModule = await import(resolverModulePath) as { resolvePromptDisplayLabel: ResolveLabel };
const compressionModule = await import(compressionModulePath) as { compressPromptLabel: CompressLabel };
const shortFixtureModule = await import(shortFixtureModulePath) as {
  AUDITED_SHORT_PROMPT_FIXTURES: ShortEvaluationFixture[];
};
const longFixtureModule = await import(longFixtureModulePath) as {
  AUDITED_LONG_PROMPT_FIXTURES: LongEvaluationFixture[];
};
const { resolvePromptDisplayLabel } = resolverModule;
const { compressPromptLabel } = compressionModule;
const { AUDITED_SHORT_PROMPT_FIXTURES } = shortFixtureModule;
const { AUDITED_LONG_PROMPT_FIXTURES } = longFixtureModule;

const shortResults = AUDITED_SHORT_PROMPT_FIXTURES.map((fixture) => {
  const result = resolvePromptDisplayLabel({
    rawText: fixture.rawText,
    mode: 'smart',
    hasResponse: true,
    sourceComplete: true,
    previousPrompt: { id: `${fixture.caseId}-previous`, text: fixture.previousPrompt },
    currentResponses: [{ id: `${fixture.caseId}-current`, text: fixture.currentResponse }],
  });
  return {
    caseId: fixture.caseId,
    baseline: fixture.rawText,
    label: result.semanticLabel,
    completionNeed: result.completionNeed,
    candidates: result.candidateCount,
    validCandidates: result.validCandidateCount,
    reason: result.primaryReason,
    accepted: fixture.allowedLabels.includes(result.semanticLabel),
    forbidden: fixture.forbiddenTerms.some((term) => result.semanticLabel.includes(term)),
  };
});

const longResults = AUDITED_LONG_PROMPT_FIXTURES.map((fixture) => {
  const compression = compressPromptLabel(fixture.rawText);
  const result = resolvePromptDisplayLabel({
    rawText: fixture.rawText,
    mode: 'smart',
    hasResponse: false,
  });
  const missingTerms = fixture.requiredTerms.filter((term) => !result.label.includes(term));
  const forbiddenTerms = fixture.forbiddenTerms.filter((term) => result.label.includes(term));
  const compressed = result.label !== fixture.rawText;
  return {
    caseId: fixture.caseId,
    raw: fixture.rawText,
    characterCount: compression.characterCount,
    compressionNeed: result.compressionNeed,
    route: result.route,
    candidates: compression.candidates,
    semanticLabel: result.semanticLabel,
    displayedLabel: result.label,
    reason: result.primaryReason,
    accepted:
      compressed === fixture.expectCompression &&
      missingTerms.length === 0 &&
      forbiddenTerms.length === 0,
    missingTerms,
    forbiddenTerms,
  };
});

console.log('\nAudited short-Prompt completion');
console.table(shortResults);
console.log('\nAudited long-Prompt compression');
console.table(longResults);

if (
  shortResults.some((result) => !result.accepted || result.forbidden) ||
  longResults.some((result) => !result.accepted)
) {
  process.exitCode = 1;
}
