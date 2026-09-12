/** @vitest-environment jsdom */
/** Tests browser-layout selection separately from semantic compression. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { selectPromptLabelForElement } from '@/navigation/promptLabelLayout';

afterEach(() => vi.restoreAllMocks());

describe('Prompt Label layout', () => {
  it('selects the first semantically valid candidate that fits two lines', () => {
    const element = document.createElement('span');
    document.body.appendChild(element);
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ width: 120 } as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return (this.textContent?.length ?? 0) > 12 ? 60 : 40;
    });
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ lineHeight: '20px' } as CSSStyleDeclaration);

    expect(selectPromptLabelForElement(element, '1. ', [
      '完整但超过两行的语义标题内容',
      '紧凑标题',
    ])).toEqual({ label: '紧凑标题', fit: 'fit' });
  });

  it('keeps the complete semantic label when no candidate fits', () => {
    const element = document.createElement('span');
    document.body.appendChild(element);
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ width: 80 } as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(60);
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ lineHeight: '20px' } as CSSStyleDeclaration);

    expect(selectPromptLabelForElement(element, '1. ', ['完整语义标题', '短标题'])).toEqual({
      label: '完整语义标题',
      fit: 'unfit',
    });
  });
});
