/** Tests fidelity-preserving Smart Label compression. */
import { describe, expect, it } from 'vitest';
import {
  PROMPT_COMPRESSION_CHARACTER_LIMIT,
  assessPromptCompressionNeed,
  compressPromptLabel,
  preservesCriticalMeaning,
} from '@/navigation/promptLabelCompression';
import { resolvePromptDisplayLabel } from '@/navigation/promptLabels';
import { AUDITED_LONG_PROMPT_FIXTURES } from '../fixtures/smartLabels/auditedLongPrompts';

describe('Prompt Label compression', () => {
  it('keeps negation, numeric values, units, and output formats', () => {
    const samples = [
      '请将邮件措辞改为想了解更多项目情况，不要说讨论研究方向',
      '把采样率从 8 kHz 改为 16 kHz，但不要改编码格式',
      '先制作最终一页英文 Research CV，再转成 LaTeX 源文件和 PDF',
    ];

    samples.forEach((source) => {
      const result = compressPromptLabel(source, true);
      expect(preservesCriticalMeaning(source, result.selectedLabel), source).toBe(true);
    });
  });

  it('rejects candidates that drop task-defining constraints', () => {
    expect(
      preservesCriticalMeaning(
        '把采样率从 8 kHz 改为 16 kHz，但不要改编码格式',
        '修改音频参数'
      )
    ).toBe(false);
    expect(
      preservesCriticalMeaning(
        'Revise the v2.1 export to produce JSON, but do not remove the 16 kHz limit.',
        'Revise the 2.1 export.'
      )
    ).toBe(false);
  });

  it('uses normalized content length rather than rendered-width estimates', () => {
    expect(assessPromptCompressionNeed('甲'.repeat(PROMPT_COMPRESSION_CHARACTER_LIMIT))).toBe(false);
    expect(assessPromptCompressionNeed('甲'.repeat(PROMPT_COMPRESSION_CHARACTER_LIMIT + 1))).toBe(true);
  });

  it('joins extracted task clauses without stacking sentence delimiters', () => {
    const result = compressPromptLabel(
      '你给了太多英文缩写，请用人话讲解。另外，请查看教授近期工作。就是我需要非常全面的信息。',
      true
    );

    expect(result.selectedLabel).not.toMatch(/[。！？!?]；/u);
    expect(result.selectedLabel).toContain('请用人话讲解；另外，请查看教授近期工作');
  });

  it('routes a long informative prompt through compression independently of completion', () => {
    const result = resolvePromptDisplayLabel({
      rawText: '请帮我排查识别问题，进一步改进短句补全，同时开始设计长标题压缩，但不要引入远程模型，也不要上传聊天文本。',
      mode: 'smart',
      hasResponse: false,
    });

    expect(result).toMatchObject({
      completionNeed: 'no',
      compressionNeed: 'yes',
      route: 'compress',
      shouldStore: true,
    });
    expect(result.semanticLabel).toBe(result.label);
    expect(result.label).toContain('不要引入远程模型');
    expect(result.label).toContain('不要上传聊天文本');
  });

  it('replays representative long prompts with one content-selected label', () => {
    AUDITED_LONG_PROMPT_FIXTURES.forEach((fixture) => {
      const result = resolvePromptDisplayLabel({
        rawText: fixture.rawText,
        mode: 'smart',
        hasResponse: false,
      });

      expect(result.compressionNeed, fixture.caseId).toBe('yes');
      expect(result.semanticLabel, fixture.caseId).toBe(result.label);
      fixture.requiredTerms.forEach((term) => {
        expect(result.label, `${fixture.caseId}: ${term}`).toContain(term);
      });
      fixture.forbiddenTerms.forEach((term) => {
        expect(result.label, `${fixture.caseId}: ${term}`).not.toContain(term);
      });
      if (fixture.expectCompression) {
        expect(result.route, fixture.caseId).toBe('compress');
        expect(result.label, fixture.caseId).not.toBe(fixture.rawText);
      } else {
        expect(result.route, fixture.caseId).toBe('abstain');
        expect(result.primaryReason, fixture.caseId).toBe('COMPRESSION_LOSS');
        expect(result.label, fixture.caseId).toBe(fixture.rawText);
      }
    });
  });
});
