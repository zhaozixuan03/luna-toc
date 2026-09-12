/** Tests Smart Label mode, derivation, and cache behavior as one local flow. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDisplayMode,
  initializeDisplayModeSettings,
  writeDisplayMode,
} from '@/navigation/displayModeSettings';
import { resolvePromptDisplayLabel } from '@/navigation/promptLabels';
import { createPromptLabelSourceSignature } from '@/navigation/promptLabelContext';
import {
  getStoredSmartLabel,
  initializeSmartLabelStore,
  storeSmartLabel,
} from '@/navigation/smartLabelStore';

const DISPLAY_MODE_KEY = 'chatToc:displayMode';
const SMART_LABEL_KEY = 'chatToc:smartLabelCache';
let storage: Record<string, unknown>;

beforeEach(() => {
  storage = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: storage[key] })),
        set: vi.fn(async (value: Record<string, unknown>) => {
          Object.assign(storage, value);
        }),
        remove: vi.fn(async (key: string) => {
          delete storage[key];
        }),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function resolveLabel(input: {
  conversationKey: string;
  message: { id: string; text: string };
  answerHeading: string | null;
  hasResponse: boolean;
}): string {
  const currentResponses = input.answerHeading
    ? [{ id: 'synthetic-answer', text: `## ${input.answerHeading}` }]
    : [];
  const sourceSignature = createPromptLabelSourceSignature(
    [],
    currentResponses,
    input.message.text
  );
  const cachedLabel = getStoredSmartLabel(
    input.conversationKey,
    input.message.id,
    1_000,
    sourceSignature
  );
  const result = resolvePromptDisplayLabel({
    rawText: input.message.text,
    mode: getDisplayMode(),
    cachedLabel,
    answerHeading: input.answerHeading,
    hasResponse: input.hasResponse,
    currentResponses,
    sourceComplete: true,
  });
  if (result.shouldStore) {
    storeSmartLabel(input.conversationKey, input.message.id, result.semanticLabel, 1_000, {
      sourceSignature,
      decisionType: result.decisionType,
    });
  }
  return result.label;
}

describe('Navigator Smart Label flow', () => {
  it('replays raw turn Markdown and invalidates a regenerated answer', async () => {
    storage[DISPLAY_MODE_KEY] = 'smart';
    await Promise.all([
      initializeDisplayModeSettings(),
      initializeSmartLabelStore(1_000),
    ]);
    const currentResponses = [
      {
        id: 'assistant-1',
        text: '**为什么频谱不重叠，就要求采样频率至少是最高频率的 2 倍？**',
      },
    ];
    const firstSignature = createPromptLabelSourceSignature(
      [],
      currentResponses,
      '差不多理解了'
    );
    const first = resolvePromptDisplayLabel({
      rawText: '差不多理解了',
      mode: 'smart',
      cachedLabel: getStoredSmartLabel('conversation', 'prompt-1', 1_000, firstSignature),
      hasResponse: true,
      sourceComplete: true,
      currentResponses,
    });
    storeSmartLabel('conversation', 'prompt-1', first.label, 1_000, {
      sourceSignature: firstSignature,
      decisionType: first.decisionType,
    });

    const regeneratedResponses = [
      { id: 'assistant-2', text: '## 奈奎斯特采样条件与频谱混叠' },
    ];
    const regeneratedSignature = createPromptLabelSourceSignature(
      [],
      regeneratedResponses,
      '差不多理解了'
    );
    expect(
      getStoredSmartLabel('conversation', 'prompt-1', 2_000, regeneratedSignature)
    ).toBeNull();
    expect(
      resolvePromptDisplayLabel({
        rawText: '差不多理解了',
        mode: 'smart',
        hasResponse: true,
        sourceComplete: true,
        currentResponses: regeneratedResponses,
      }).label
    ).toBe('奈奎斯特采样条件与频谱混叠');
  });

  it('does not call browser network APIs while resolving labels', async () => {
    const fetchSpy = vi.fn();
    const sendBeaconSpy = vi.fn();
    const xmlHttpRequestSpy = vi.fn();
    const webSocketSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('navigator', { sendBeacon: sendBeaconSpy });
    vi.stubGlobal('XMLHttpRequest', xmlHttpRequestSpy);
    vi.stubGlobal('WebSocket', webSocketSpy);
    storage[DISPLAY_MODE_KEY] = 'smart';
    await Promise.all([
      initializeDisplayModeSettings(),
      initializeSmartLabelStore(1_000),
    ]);

    resolveLabel({
      conversationKey: 'offline-conversation',
      message: { id: 'offline-message', text: '可以理解，继续。' },
      answerHeading: '频率与波长的关系',
      hasResponse: true,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sendBeaconSpy).not.toHaveBeenCalled();
    expect(xmlHttpRequestSpy).not.toHaveBeenCalled();
    expect(webSocketSpy).not.toHaveBeenCalled();
  });

  it('keeps prompt identity stable across Smart, cached, and Raw renders', async () => {
    storage[DISPLAY_MODE_KEY] = 'smart';
    await Promise.all([
      initializeDisplayModeSettings(),
      initializeSmartLabelStore(1_000),
    ]);
    const message = { id: 'synthetic-message-3', text: '可以理解，继续。' };
    const originalMessage = structuredClone(message);
    const input = {
      conversationKey: 'synthetic-conversation',
      message,
      answerHeading: '第 3 小点：什么叫“波长”？',
      hasResponse: true,
    };

    expect(resolveLabel(input)).toBe('第 3 小点：什么叫“波长”？');
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(storage[SMART_LABEL_KEY]).toBeDefined();

    expect(resolveLabel(input)).toBe('第 3 小点：什么叫“波长”？');
    expect(
      resolveLabel({ ...input, answerHeading: '后来出现的不同标题' })
    ).toBe('后来出现的不同标题');
    await writeDisplayMode('raw');
    expect(resolveLabel(input)).toBe('可以理解，继续。');
    expect(message).toEqual(originalMessage);
  });

  it('keeps unanswered prompts raw and scopes equal message IDs by conversation', async () => {
    storage[DISPLAY_MODE_KEY] = 'smart';
    await Promise.all([
      initializeDisplayModeSettings(),
      initializeSmartLabelStore(1_000),
    ]);
    const message = { id: 'same-index', text: '好的，继续讲吧。' };

    expect(
      resolveLabel({
        conversationKey: 'conversation-a',
        message,
        answerHeading: null,
        hasResponse: false,
      })
    ).toBe('好的，继续讲吧。');
    expect(
      resolveLabel({
        conversationKey: 'conversation-a',
        message,
        answerHeading: '频率如何影响波长？',
        hasResponse: true,
      })
    ).toBe('频率如何影响波长？');
    expect(
      resolveLabel({
        conversationKey: 'conversation-b',
        message,
        answerHeading: '天线长度为什么取四分之一波长？',
        hasResponse: true,
      })
    ).toBe('天线长度为什么取四分之一波长？');
  });
});
