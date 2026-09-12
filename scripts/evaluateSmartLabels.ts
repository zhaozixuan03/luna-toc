/** Replays audited Smart Label fixtures for local developer evaluation. */
const resolverModulePath = '../src/navigation/promptLabels.ts';
const fixtureModulePath = '../test/fixtures/smartLabels/auditedShortPrompts.ts';
interface EvaluationFixture {
  caseId: string;
  rawText: string;
  previousPrompt: string;
  currentResponse: string;
  allowedLabels: string[];
  forbiddenTerms: string[];
}
interface EvaluationResult {
  semanticLabel: string;
  completionNeed: string;
  candidateCount: number;
  validCandidateCount: number;
  primaryReason: string;
}
type ResolveLabel = (input: Record<string, unknown>) => EvaluationResult;

const resolverModule = await import(resolverModulePath) as { resolvePromptDisplayLabel: ResolveLabel };
const fixtureModule = await import(fixtureModulePath) as {
  AUDITED_SHORT_PROMPT_FIXTURES: EvaluationFixture[];
};
const { resolvePromptDisplayLabel } = resolverModule;
const { AUDITED_SHORT_PROMPT_FIXTURES } = fixtureModule;

const results = AUDITED_SHORT_PROMPT_FIXTURES.map((fixture) => {
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

console.table(results);
if (results.some((result) => !result.accepted || result.forbidden)) process.exitCode = 1;
