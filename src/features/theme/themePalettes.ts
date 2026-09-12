/** Defines LunaTOC palette presets and applies custom palette variables. */

export type ThemePaletteId =
  | 'luna-blue'
  | 'chatgpt-warm'
  | 'sage'
  | 'violet'
  | 'custom';

export interface CustomThemeColors {
  background: string;
  text: string;
  accent: string;
}

export interface ThemePaletteOption {
  id: ThemePaletteId;
  label: string;
  preview: string;
}

export const THEME_PALETTE_OPTIONS: ThemePaletteOption[] = [
  { id: 'luna-blue', label: 'Luna Blue', preview: '#3b82f6' },
  { id: 'chatgpt-warm', label: 'ChatGPT Warm', preview: '#b35c44' },
  { id: 'sage', label: 'Sage', preview: '#5f7f6d' },
  { id: 'violet', label: 'Violet', preview: '#7c6bc4' },
  { id: 'custom', label: 'Custom', preview: 'linear-gradient(135deg,#ef4444,#3b82f6)' },
];

export const DEFAULT_CUSTOM_THEME_COLORS: CustomThemeColors = {
  background: '#282522',
  text: '#f2ebe3',
  accent: '#c86b4a',
};

const CUSTOM_PROPERTIES = [
  '--ct-custom-background',
  '--ct-custom-text',
  '--ct-custom-accent',
  '--p-custom-background',
  '--p-custom-text',
  '--p-custom-accent',
] as const;

/** Applies a palette selector and its optional custom color variables. */
export function applyThemePalette(
  element: HTMLElement,
  palette: ThemePaletteId,
  customColors: CustomThemeColors
): void {
  element.dataset.palette = palette;
  CUSTOM_PROPERTIES.forEach((property) => element.style.removeProperty(property));
  if (palette !== 'custom') return;

  element.style.setProperty('--ct-custom-background', customColors.background);
  element.style.setProperty('--ct-custom-text', customColors.text);
  element.style.setProperty('--ct-custom-accent', customColors.accent);
  element.style.setProperty('--p-custom-background', customColors.background);
  element.style.setProperty('--p-custom-text', customColors.text);
  element.style.setProperty('--p-custom-accent', customColors.accent);
}

/** Returns whether a value is one of the supported palette IDs. */
export function isThemePaletteId(value: unknown): value is ThemePaletteId {
  return THEME_PALETTE_OPTIONS.some((option) => option.id === value);
}

/** Accepts only opaque six-digit hexadecimal colors. */
export function isThemeColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}
