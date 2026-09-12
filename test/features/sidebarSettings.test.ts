/** @vitest-environment jsdom */
/** Tests the discoverable sidebar appearance and cache controls. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeSidebarSettings } from '@/features/sidebar/sidebarSettings';

const SETTINGS_KEY = 'chatToc:themeSettings';
const CACHE_KEY = 'chatToc:smartLabelCache';
const settings = {
  followChatGPT: true,
  manualTheme: 'dark',
  palette: 'luna-blue',
  customColors: {
    background: '#282522',
    text: '#f2ebe3',
    accent: '#c86b4a',
  },
};

beforeEach(() => {
  document.body.innerHTML = `
    <div class="navigator-topbar">
      <div class="navigator-header">
        <button id="search-toggle-btn"></button>
      </div>
      <div id="luna-toc-status"></div>
    </div>`;
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async () => ({ [SETTINGS_KEY]: settings })),
        set: vi.fn(async () => undefined),
        remove: vi.fn(async () => undefined),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  });
});

afterEach(() => {
  document.body.textContent = '';
  vi.restoreAllMocks();
});

describe('sidebar settings', () => {
  it('opens from the gear and exposes palette and cache controls', async () => {
    await initializeSidebarSettings();

    const gear = document.querySelector<HTMLButtonElement>(
      '#navigator-settings-btn'
    );
    const panel = document.querySelector<HTMLElement>(
      '#navigator-settings-panel'
    );
    gear?.click();

    expect(panel?.hidden).toBe(false);
    document
      .querySelector<HTMLButtonElement>('[data-palette="chatgpt-warm"]')
      ?.click();
    await Promise.resolve();
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [SETTINGS_KEY]: { ...settings, palette: 'chatgpt-warm' },
    });

    document
      .querySelector<HTMLButtonElement>('#navigator-clear-smart-labels')
      ?.click();
    await Promise.resolve();
    expect(chrome.storage.local.remove).toHaveBeenCalledWith(CACHE_KEY);
  });
});
