/** Tests fidelity-preserving Smart Label compression. */
import { describe, expect, it } from 'vitest';
import {
  compressPromptLabel,
  preservesCriticalMeaning,
} from '@/navigation/promptLabelCompression';
import { resolvePromptDisplayLabel } from '@/navigation/promptLabels';

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
    expect(result.label).toContain('不要引入远程模型');
    expect(result.label).toContain('不要上传聊天文本');
  });
});
