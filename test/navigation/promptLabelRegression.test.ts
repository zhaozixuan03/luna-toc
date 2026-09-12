/** Replays the audited short-prompt development fixtures. */
import { describe, expect, it } from 'vitest';
import { resolvePromptDisplayLabel } from '@/navigation/promptLabels';
import { AUDITED_SHORT_PROMPT_FIXTURES } from '../fixtures/smartLabels/auditedShortPrompts';

describe('Audited Smart Label regressions', () => {
  it('completes all four prompts from evidence without forbidden claims', () => {
    AUDITED_SHORT_PROMPT_FIXTURES.forEach((fixture) => {
      const result = resolvePromptDisplayLabel({
        rawText: fixture.rawText,
        mode: 'smart',
        hasResponse: true,
        sourceComplete: true,
        previousPrompt: { id: `${fixture.caseId}-previous`, text: fixture.previousPrompt },
        currentResponses: [{ id: `${fixture.caseId}-current`, text: fixture.currentResponse }],
      });

      expect(result.completionNeed, fixture.caseId).toBe('yes');
      expect(result.candidateCount, fixture.caseId).toBeGreaterThan(0);
      expect(fixture.allowedLabels, fixture.caseId).toContain(result.semanticLabel);
      fixture.forbiddenTerms.forEach((term) => {
        expect(result.semanticLabel, `${fixture.caseId}: ${term}`).not.toContain(term);
      });
    });
  });
});
