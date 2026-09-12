/** Tests the persisted Raw and Smart directory display preference. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDisplayMode,
  initializeDisplayModeSettings,
  readDisplayMode,
  subscribeDisplayMode,
  writeDisplayMode,
} from '@/navigation/displayModeSettings';

const SETTINGS_KEY = 'chatToc:displayMode';
let storedValue: unknown;
let changeListener:
  | ((changes: Record<string, chrome.storage.StorageChange>, area: string) => void)
  | null;

beforeEach(() => {
  storedValue = undefined;
  changeListener = null;
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async () => ({ [SETTINGS_KEY]: storedValue })),
        set: vi.fn(async (value: Record<string, unknown>) => {
          storedValue = value[SETTINGS_KEY];
        }),
      },
      onChanged: {
        addListener: vi.fn((listener) => {
          changeListener = listener;
        }),
        removeListener: vi.fn(),
      },
    },
  });
});

describe('display mode settings', () => {
  it('defaults invalid or missing values to Raw', async () => {
    await expect(readDisplayMode()).resolves.toBe('raw');
    storedValue = 'topic';
    await expect(readDisplayMode()).resolves.toBe('raw');
  });

  it('loads and writes Smart mode', async () => {
    storedValue = 'smart';
    await initializeDisplayModeSettings();
    expect(getDisplayMode()).toBe('smart');

    await writeDisplayMode('raw');
    expect(storedValue).toBe('raw');
    expect(getDisplayMode()).toBe('raw');
  });

  it('publishes changes from another extension context', () => {
    const listener = vi.fn();
    subscribeDisplayMode(listener);
    changeListener?.(
      { [SETTINGS_KEY]: { newValue: 'smart' } },
      'local'
    );

    expect(listener).toHaveBeenCalledWith('smart');
    expect(getDisplayMode()).toBe('smart');
  });
});
