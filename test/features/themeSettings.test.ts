/** Tests theme-palette persistence and migration. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readThemeSettings,
  writeThemeSettings,
} from '@/features/theme/themeSettings';

const SETTINGS_KEY = 'chatToc:themeSettings';
const LEGACY_THEME_KEY = 'chatToc:theme';
let storedSettings: unknown;
let legacyTheme: unknown;

beforeEach(() => {
  storedSettings = undefined;
  legacyTheme = undefined;
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async () => ({
          [SETTINGS_KEY]: storedSettings,
          [LEGACY_THEME_KEY]: legacyTheme,
        })),
        set: vi.fn(async (value: Record<string, unknown>) => {
          storedSettings = value[SETTINGS_KEY];
        }),
      },
    },
  });
});

describe('theme settings', () => {
  it('adds Luna Blue defaults to the previous settings shape', async () => {
    storedSettings = { followChatGPT: true, manualTheme: 'dark' };

    await expect(readThemeSettings()).resolves.toMatchObject({
      followChatGPT: true,
      manualTheme: 'dark',
      palette: 'luna-blue',
    });
  });

  it('persists a valid custom palette', async () => {
    const settings = {
      followChatGPT: false,
      manualTheme: 'light' as const,
      palette: 'custom' as const,
      customColors: {
        background: '#112233',
        text: '#fefefe',
        accent: '#aa5533',
      },
    };
    await writeThemeSettings(settings);

    await expect(readThemeSettings()).resolves.toEqual(settings);
  });

  it('rejects malformed custom colors without rejecting appearance settings', async () => {
    storedSettings = {
      followChatGPT: false,
      manualTheme: 'light',
      palette: 'custom',
      customColors: {
        background: 'red',
        text: '#ffffff',
        accent: '#000000',
      },
    };

    const settings = await readThemeSettings();
    expect(settings.palette).toBe('custom');
    expect(settings.customColors.background).toBe('#282522');
  });
});
