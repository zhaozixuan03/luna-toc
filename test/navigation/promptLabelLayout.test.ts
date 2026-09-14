/** @vitest-environment jsdom */
/** Tests browser-layout selection separately from semantic compression. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { measurePromptLabelForElement } from '@/navigation/promptLabelLayout';

afterEach(() => vi.restoreAllMocks());

describe('Prompt Label layout', () => {
  it('reports fit without replacing the selected semantic label', () => {
    const element = document.createElement('span');
    document.body.appendChild(element);
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ width: 120 } as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return (this.textContent?.length ?? 0) > 12 ? 60 : 40;
    });
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ lineHeight: '20px' } as CSSStyleDeclaration);

    expect(
      measurePromptLabelForElement(
        element,
        '1. ',
        '完整但超过两行的语义标题内容'
      )
    ).toEqual({ label: '完整但超过两行的语义标题内容', fit: 'unfit' });
  });

  it('returns the same semantic label at narrow and wide widths', () => {
    const element = document.createElement('span');
    document.body.appendChild(element);
    let width = 80;
    vi.spyOn(element, 'getBoundingClientRect').mockImplementation(
      () => ({ width } as DOMRect)
    );
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
      () => width < 200 ? 60 : 40
    );
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ lineHeight: '20px' } as CSSStyleDeclaration);

    const label = '由内容决定的唯一语义标题';
    const narrow = measurePromptLabelForElement(element, '1. ', label);
    width = 320;
    const wide = measurePromptLabelForElement(element, '1. ', label);

    expect(narrow).toEqual({ label, fit: 'unfit' });
    expect(wide).toEqual({ label, fit: 'fit' });
  });
});
