/** Provides discoverable appearance and Smart Label controls inside the sidebar. */

import {
  readThemeSettings,
  subscribeThemeSettings,
  writeThemeSettings,
  type ThemeSettings,
} from '@/features/theme/themeSettings';
import {
  isThemePaletteId,
  THEME_PALETTE_OPTIONS,
  type CustomThemeColors,
} from '@/features/theme/themePalettes';
import { clearSmartLabelCache } from '@/navigation/smartLabelStore';

/** Creates and binds the sidebar settings button and inline panel. */
export async function initializeSidebarSettings(): Promise<void> {
  const header = document.querySelector<HTMLElement>('.navigator-header');
  const topbar = document.querySelector<HTMLElement>('.navigator-topbar');
  const searchButton = document.getElementById('search-toggle-btn');
  if (!header || !topbar || !searchButton) return;

  const settingsButton = createSettingsButton();
  const panel = createSettingsPanel();
  header.insertBefore(settingsButton, searchButton);
  topbar.insertBefore(panel, document.getElementById('luna-toc-status'));

  let settings = await readThemeSettings();

  const syncPanel = (nextSettings: ThemeSettings): void => {
    settings = nextSettings;
    panel
      .querySelectorAll<HTMLButtonElement>('[data-palette]')
      .forEach((button) => {
        const isActive = button.dataset.palette === settings.palette;
        button.classList.toggle('navigator-settings-palette-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });

    const customControls = panel.querySelector<HTMLElement>(
      '.navigator-settings-custom'
    );
    if (customControls) customControls.hidden = settings.palette !== 'custom';
    (
      Object.keys(settings.customColors) as Array<keyof CustomThemeColors>
    ).forEach((key) => {
      const input = panel.querySelector<HTMLInputElement>(
        `[data-custom-color="${key}"]`
      );
      if (input) input.value = settings.customColors[key];
    });
  };

  const closePanel = (): void => {
    panel.hidden = true;
    settingsButton.setAttribute('aria-expanded', 'false');
  };

  settingsButton.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    settingsButton.setAttribute('aria-expanded', String(!panel.hidden));
  });
  panel
    .querySelectorAll<HTMLButtonElement>('[data-palette]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const palette = button.dataset.palette;
        if (!isThemePaletteId(palette)) return;
        const nextSettings = { ...settings, palette };
        syncPanel(nextSettings);
        void writeThemeSettings(nextSettings);
      });
    });
  panel
    .querySelectorAll<HTMLInputElement>('[data-custom-color]')
    .forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.customColor as keyof CustomThemeColors;
        const nextSettings = {
          ...settings,
          customColors: { ...settings.customColors, [key]: input.value },
        };
        syncPanel(nextSettings);
        void writeThemeSettings(nextSettings);
      });
    });

  panel
    .querySelector<HTMLButtonElement>('#navigator-clear-smart-labels')
    ?.addEventListener('click', (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      button.disabled = true;
      void clearSmartLabelCache().finally(() => {
        button.textContent = 'Cache cleared';
        window.setTimeout(() => {
          button.textContent = 'Clear Smart Label cache';
          button.disabled = false;
        }, 1_500);
      });
    });

  document.addEventListener('click', (event) => {
    if (panel.hidden || !(event.target instanceof Node)) return;
    if (panel.contains(event.target) || settingsButton.contains(event.target)) {
      return;
    }
    closePanel();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePanel();
  });

  syncPanel(settings);
  subscribeThemeSettings(syncPanel);
}

function createSettingsButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = 'navigator-settings-btn';
  button.className = 'navigator-icon-btn navigator-header-icon-btn';
  button.type = 'button';
  button.title = 'Appearance and Smart Label settings';
  button.setAttribute('aria-label', button.title);
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = `
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.05.08V22h-4v-1.92l-.05-.08a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1l-.08-.05H2v-4h1.92L4 9.9a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.05-.08V2h4v1.92L14 4a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.08.4.3.75.6 1l.08.05H22v4h-1.92L20 14a1.7 1.7 0 0 0-.6 1Z"></path>
    </svg>`;
  return button;
}

function createSettingsPanel(): HTMLDivElement {
  const panel = document.createElement('div');
  panel.id = 'navigator-settings-panel';
  panel.className = 'navigator-settings-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="navigator-settings-heading">Appearance</div>
    <div class="navigator-settings-palettes" aria-label="Color palette">
      ${THEME_PALETTE_OPTIONS.map(
        (option) => `
          <button type="button" data-palette="${option.id}" aria-pressed="false">
            <span style="background:${option.preview}"></span>${option.label}
          </button>`
      ).join('')}
    </div>
    <div class="navigator-settings-custom" hidden>
      ${(['background', 'text', 'accent'] as const)
        .map(
          (key) => `
            <label><input type="color" data-custom-color="${key}">${key}</label>`
        )
        .join('')}
    </div>
    <div class="navigator-settings-privacy">
      Smart Labels are generated and stored only on this device.
    </div>
    <button id="navigator-clear-smart-labels" type="button">Clear Smart Label cache</button>`;
  return panel;
}
