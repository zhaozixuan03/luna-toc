/** Renders appearance, palette, and custom-color controls for the popup. */
import { Moon, Sun } from 'lucide-react';
import type {
  ResolvedTheme,
  ThemeSettings as ThemeSettingsValue,
} from '@/features/theme/themeSettings';
import {
  THEME_PALETTE_OPTIONS,
  type CustomThemeColors,
  type ThemePaletteId,
} from '@/features/theme/themePalettes';

interface ThemeSettingsProps {
  settings: ThemeSettingsValue;
  resolvedTheme: ResolvedTheme;
  onChange: (settings: ThemeSettingsValue) => void;
  onClearSmartLabels: () => void;
  cacheCleared: boolean;
}

/** Displays follow and resolved theme controls in one compact row. */
export function ThemeSettings({
  settings,
  resolvedTheme,
  onChange,
  onClearSmartLabels,
  cacheCleared,
}: ThemeSettingsProps): React.JSX.Element {
  const toggleFollow = (): void => {
    onChange({ ...settings, followChatGPT: !settings.followChatGPT });
  };
  const toggleManualTheme = (): void => {
    onChange({
      ...settings,
      manualTheme: settings.manualTheme === 'dark' ? 'light' : 'dark',
    });
  };
  const selectPalette = (palette: ThemePaletteId): void => {
    onChange({ ...settings, palette });
  };
  const updateCustomColor = (
    key: keyof CustomThemeColors,
    value: string
  ): void => {
    onChange({
      ...settings,
      customColors: { ...settings.customColors, [key]: value },
    });
  };

  return (
    <section
      className="mb-2.5 border-b border-(--p-toggle-border) pb-2"
      aria-labelledby="theme-heading"
    >
      <div className="flex min-h-6 items-center gap-2">
        <h2
          id="theme-heading"
          className="m-0 mr-auto text-[10px] font-semibold uppercase tracking-[0.08em] text-(--p-toggle-text)"
        >
          Theme
        </h2>
        <span className="text-[10px] font-medium text-(--p-toggle-text)">
          Follow ChatGPT
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={settings.followChatGPT}
          aria-label="Follow ChatGPT theme"
          className={`relative h-4.5 w-8 cursor-pointer rounded-full border outline-none transition duration-150 hover:border-(--p-accent) focus-visible:ring-2 focus-visible:ring-(--p-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--p-bg-main) active:scale-[0.97] ${
            settings.followChatGPT
              ? 'border-(--p-toggle-bg-active) bg-(--p-toggle-bg-active)'
              : 'border-(--p-toggle-border) bg-(--p-toggle-bg)'
          }`}
          onClick={toggleFollow}
        >
          <span
            className={`absolute top-0.5 left-0 size-3 rounded-full bg-white shadow-sm transition-transform ${
              settings.followChatGPT ? 'translate-x-4.25' : 'translate-x-0.5'
            }`}
          />
        </button>
        <button
          type="button"
          disabled={settings.followChatGPT}
          aria-label={
            settings.followChatGPT
              ? `Current theme: ${resolvedTheme}`
              : `Current theme: ${resolvedTheme}. Click to switch theme`
          }
          title={
            settings.followChatGPT
              ? `Following ChatGPT: ${resolvedTheme}`
              : `Current theme: ${resolvedTheme}. Click to switch`
          }
          className={`inline-flex size-6 appearance-none items-center justify-center border-0 bg-transparent p-0 outline-none transition duration-150 focus-visible:ring-2 focus-visible:ring-(--p-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--p-bg-main) ${
            settings.followChatGPT
              ? 'cursor-default opacity-55'
              : 'cursor-pointer hover:scale-110 hover:brightness-125 active:scale-95'
          } ${resolvedTheme === 'dark' ? 'text-blue-400' : 'text-amber-600'}`}
          onClick={toggleManualTheme}
        >
          {resolvedTheme === 'dark' ? (
            <Moon
              aria-hidden="true"
              viewBox="2 2 20 20"
              className="size-5 drop-shadow-[0_0_4px_currentColor]"
            />
          ) : (
            <Sun
              aria-hidden="true"
              viewBox="2 2 20 20"
              className="size-5 drop-shadow-[0_0_4px_currentColor]"
            />
          )}
        </button>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1" aria-label="Color palette">
        {THEME_PALETTE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={settings.palette === option.id}
            title={option.label}
            className={`flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-md border px-1 py-1.5 text-[9px] text-(--p-toggle-text) transition hover:border-(--p-accent) ${
              settings.palette === option.id
                ? 'border-(--p-accent) bg-(--p-bg-note)'
                : 'border-(--p-toggle-border) bg-transparent'
            }`}
            onClick={() => selectPalette(option.id)}
          >
            <span
              className="size-3.5 rounded-full border border-white/25"
              style={{ background: option.preview }}
            />
            <span className="w-full truncate">{option.label}</span>
          </button>
        ))}
      </div>
      {settings.palette === 'custom' && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(['background', 'text', 'accent'] as const).map((key) => (
            <label
              key={key}
              className="flex items-center gap-1 text-[9px] capitalize text-(--p-toggle-text)"
            >
              <input
                type="color"
                className="size-5 cursor-pointer appearance-none rounded border border-(--p-toggle-border) bg-transparent p-0"
                value={settings.customColors[key]}
                onChange={(event) => updateCustomColor(key, event.target.value)}
              />
              {key}
            </label>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between border-t border-(--p-toggle-border) pt-2">
        <span className="text-[9px] text-(--p-toggle-text)">
          Smart Labels stay on this device.
        </span>
        <button
          type="button"
          className="cursor-pointer rounded border border-(--p-toggle-border) bg-transparent px-2 py-1 text-[9px] text-(--p-toggle-text) hover:border-(--p-accent) hover:text-(--p-accent)"
          onClick={onClearSmartLabels}
        >
          {cacheCleared ? 'Cleared' : 'Clear cache'}
        </button>
      </div>
    </section>
  );
}
