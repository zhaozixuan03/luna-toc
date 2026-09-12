/** Selects a semantically validated Smart Label using actual sidebar geometry. */

export interface PromptLabelLayoutResult {
  label: string;
  fit: 'fit' | 'unfit' | 'unmeasured';
}

interface RegisteredLabel {
  element: HTMLElement;
  prefix: string;
  candidates: string[];
  onResult: (result: PromptLabelLayoutResult) => void;
}

/** Batches two-line measurements and remeasures only when sidebar width changes. */
export class PromptLabelLayoutScheduler {
  private readonly entries = new Map<HTMLElement, RegisteredLabel>();
  private readonly observer: ResizeObserver | null;
  private queued = false;

  public constructor(private readonly container: HTMLElement) {
    this.observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => this.queueMeasure());
    this.observer?.observe(container);
    void document.fonts?.ready.then(() => this.queueMeasure());
  }

  /** Registers one rendered row without rerunning semantic generation. */
  public register(
    element: HTMLElement,
    prefix: string,
    candidates: string[],
    onResult: (result: PromptLabelLayoutResult) => void
  ): void {
    this.entries.set(element, { element, prefix, candidates: [...new Set(candidates)], onResult });
    this.queueMeasure();
  }

  /** Stops observation and releases references to removed rows. */
  public dispose(): void {
    this.observer?.disconnect();
    this.entries.clear();
  }

  private queueMeasure(): void {
    if (this.queued) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      this.measureAll();
    });
  }

  private measureAll(): void {
    for (const [element, entry] of this.entries) {
      if (!element.isConnected) {
        this.entries.delete(element);
        continue;
      }
      entry.onResult(selectPromptLabelForElement(entry.element, entry.prefix, entry.candidates));
    }
  }
}

/** Chooses the first complete candidate that fits two unclamped rendered lines. */
export function selectPromptLabelForElement(
  element: HTMLElement,
  prefix: string,
  candidates: string[]
): PromptLabelLayoutResult {
  const width = element.getBoundingClientRect().width;
  if (width <= 0 || !element.isConnected) {
    return { label: candidates[0] ?? '', fit: 'unmeasured' };
  }

  const measurement = element.cloneNode(false) as HTMLElement;
  measurement.classList.add('navigator-item-text-measurement');
  measurement.dataset.smartLabel = 'true';
  measurement.style.width = `${width}px`;
  document.body.appendChild(measurement);
  try {
    for (const candidate of candidates) {
      measurement.textContent = `${prefix}${candidate}`;
      const lineHeight = Number.parseFloat(getComputedStyle(measurement).lineHeight) || 20;
      if (measurement.scrollHeight <= lineHeight * 2 + 0.5) {
        return { label: candidate, fit: 'fit' };
      }
    }
    return { label: candidates[0] ?? '', fit: 'unfit' };
  } finally {
    measurement.remove();
  }
}
