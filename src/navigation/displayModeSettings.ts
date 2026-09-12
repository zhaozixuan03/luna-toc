/** Persists the user's Raw or Smart table-of-contents display preference. */

export type TocDisplayMode = 'raw' | 'smart';

const SETTINGS_KEY = 'chatToc:displayMode';
const DEFAULT_MODE: TocDisplayMode = 'raw';

let currentMode: TocDisplayMode = DEFAULT_MODE;

/** Loads the display mode before the sidebar is rendered. */
export async function initializeDisplayModeSettings(): Promise<void> {
  currentMode = await readDisplayMode();
}

/** Returns the currently loaded display mode synchronously. */
export function getDisplayMode(): TocDisplayMode {
  return currentMode;
}

/** Reads the persisted display mode, falling back to Raw. */
export async function readDisplayMode(): Promise<TocDisplayMode> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return normalizeDisplayMode(result[SETTINGS_KEY]) ?? DEFAULT_MODE;
}

/** Saves and publishes a display-mode preference. */
export async function writeDisplayMode(mode: TocDisplayMode): Promise<void> {
  currentMode = mode;
  await chrome.storage.local.set({ [SETTINGS_KEY]: mode });
}

/** Subscribes to display-mode changes from another extension context. */
export function subscribeDisplayMode(
  listener: (mode: TocDisplayMode) => void
): () => void {
  const handleChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ): void => {
    if (areaName !== 'local' || !changes[SETTINGS_KEY]) return;
    const mode = normalizeDisplayMode(changes[SETTINGS_KEY].newValue);
    if (!mode) return;
    currentMode = mode;
    listener(mode);
  };

  chrome.storage.onChanged.addListener(handleChange);
  return () => chrome.storage.onChanged.removeListener(handleChange);
}

function normalizeDisplayMode(value: unknown): TocDisplayMode | null {
  return value === 'raw' || value === 'smart' ? value : null;
}
