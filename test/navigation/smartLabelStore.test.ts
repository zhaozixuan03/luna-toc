/** Tests the bounded local-only Smart Label cache. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SMART_LABEL_CACHE_LIMITS,
  clearSmartLabelCache,
  getSmartLabelCacheLookup,
  getStoredSmartLabel,
  initializeSmartLabelStore,
  storeSmartLabel,
} from '@/navigation/smartLabelStore';

const STORAGE_KEY = 'chatToc:smartLabelCache';
let storedValue: unknown;

beforeEach(() => {
  storedValue = undefined;
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async () => ({ [STORAGE_KEY]: storedValue })),
        set: vi.fn(async (value: Record<string, unknown>) => {
          storedValue = value[STORAGE_KEY];
        }),
        remove: vi.fn(async () => {
          storedValue = undefined;
        }),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  });
});

describe('Smart Label store', () => {
  it('persists only identifiers, labels, and cache metadata', async () => {
    await initializeSmartLabelStore(1_000);
    storeSmartLabel('conversation-1', 'message-1', '继续：天线原理', 1_000, {
      sourceSignature: 'signature-1',
    });
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(JSON.stringify(storedValue)).toContain('继续：天线原理');
    expect(JSON.stringify(storedValue)).not.toContain('sourcePrompt');
    expect(getStoredSmartLabel('conversation-1', 'message-1', Date.now(), 'signature-1')).toBe(
      '继续：天线原理'
    );
  });

  it('removes expired conversations when initialized', async () => {
    storedValue = {
      version: 2,
      conversations: {
        expired: { lastAccessedAt: 0, labels: {} },
      },
    };

    await initializeSmartLabelStore(SMART_LABEL_CACHE_LIMITS.maximumAgeMs + 1);
    expect(getStoredSmartLabel('expired', 'message-1')).toBeNull();
  });

  it('invalidates labels from previous algorithms', async () => {
    storedValue = {
      version: 1,
      conversations: {
        conversation: {
          lastAccessedAt: 1_000,
          labels: {
            message: { label: '确认并继续：旧标题', updatedAt: 1_000 },
          },
        },
      },
    };

    await initializeSmartLabelStore(1_000);
    expect(getStoredSmartLabel('conversation', 'message')).toBeNull();

    storedValue = {
      version: 4,
      conversations: {
        conversation: {
          lastAccessedAt: 1_000,
          labels: {
            message: {
              label: '版本四压缩前标题',
              updatedAt: 1_000,
              algorithmVersion: 4,
              sourceSignature: 'signature',
              decisionType: 'compress',
            },
          },
        },
      },
    };
    await initializeSmartLabelStore(1_000);
    expect(getStoredSmartLabel('conversation', 'message')).toBeNull();
  });

  it('distinguishes unverifiable and stale cache records', async () => {
    await initializeSmartLabelStore(1_000);
    storeSmartLabel('conversation', 'message', '标签', 1_000, {
      sourceSignature: 'current-signature',
    });

    expect(getSmartLabelCacheLookup('conversation', 'message', 1_000)).toEqual({
      label: null,
      status: 'unverifiable',
    });
    expect(
      getSmartLabelCacheLookup('conversation', 'message', 1_000, 'other-signature')
    ).toEqual({ label: null, status: 'stale' });
  });

  it('clears persisted and in-memory labels', async () => {
    await initializeSmartLabelStore(1_000);
    storeSmartLabel('conversation-1', 'message-1', 'label', 1_000);
    await clearSmartLabelCache();

    expect(storedValue).toBeUndefined();
    expect(getStoredSmartLabel('conversation-1', 'message-1')).toBeNull();
  });

  it('restores the same derived label after store reinitialization', async () => {
    await initializeSmartLabelStore(1_000);
    storeSmartLabel('conversation-1', 'message-1', '第 3 小点：什么叫波长？', 1_000, {
      sourceSignature: 'signature-2',
    });
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    await initializeSmartLabelStore(2_000);

    expect(getStoredSmartLabel('conversation-1', 'message-1', 2_000, 'signature-2')).toBe(
      '第 3 小点：什么叫波长？'
    );
  });

  it('invalidates one label when its source revision changes', async () => {
    await initializeSmartLabelStore(1_000);
    storeSmartLabel('conversation-1', 'message-1', '原标签', 1_000, {
      sourceSignature: '3:10:first',
      decisionType: 'continue',
    });

    expect(
      getStoredSmartLabel('conversation-1', 'message-1', 1_000, '3:10:first')
    ).toBe('原标签');
    expect(
      getStoredSmartLabel('conversation-1', 'message-1', 1_000, '3:12:regenerated')
    ).toBeNull();
  });
});
