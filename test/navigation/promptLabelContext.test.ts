/** Tests Smart Label evidence extraction and exact source provenance. */
import { describe, expect, it } from 'vitest';
import {
  extractPreviousOptionGroups,
  extractResponseLabelCandidates,
} from '@/navigation/promptLabelContext';

describe('Prompt Label context', () => {
  it('extracts ordinary task sentences with evidence-bound message ranges', () => {
    const text = '好，我下一步继续收口，先做**最终一页英文 Research CV 正文**，再转 LaTeX。';
    const candidates = extractResponseLabelCandidates([{ id: 'answer', text }]);

    expect(candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'response-task',
        text: '整理最终一页英文 Research CV 正文',
        sourceMessageId: 'answer',
        sourceStart: 0,
        sourceEnd: text.length,
      }),
    ]));
  });

  it('maps CRLF and joined option evidence back to the owning messages', () => {
    const groups = extractPreviousOptionGroups([
      { id: 'answer-a', text: '请选择路径？\r\nA. 路径甲' },
      { id: 'answer-b', text: 'B. 路径乙' },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].options.get('A')).toMatchObject({
      sourceMessageId: 'answer-a',
      sourceStart: '请选择路径？\r\n'.length,
    });
    expect(groups[0].options.get('B')).toMatchObject({
      sourceMessageId: 'answer-b',
      sourceStart: 0,
    });
  });

  it('does not turn a negated Assistant task into a positive action', () => {
    const candidates = extractResponseLabelCandidates([
      { id: 'answer', text: '目前不建议制作 **Benedict 专用版 CV**。' },
    ]);

    expect(candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'response-task',
        text: '暂不制作 Benedict 专用版 CV',
      }),
    ]));
    expect(candidates.map((candidate) => candidate.text)).not.toContain('制作 Benedict 专用版 CV');
  });
});
