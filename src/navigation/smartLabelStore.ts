/** Maintains the bounded, local-only cache of generated Smart Labels. */

interface StoredLabel {
  label: string;
  updatedAt: number;
  algorithmVersion: 4;
  sourceSignature: string;
  decisionType: string;
}

interface StoredConversationLabels {
  lastAccessedAt: number;
  labels: Record<string, StoredLabel>;
}

interface SmartLabelCache {
  version: 4;
  conversations: Record<string, StoredConversationLabels>;
}

export const SMART_LABEL_CACHE_LIMITS = {
  maximumConversations: 50,
  maximumLabelsPerConversation: 500,
  maximumAgeMs: 180 * 24 * 60 * 60 * 1_000,
} as const;

const STORAGE_KEY = 'chatToc:smartLabelCache';
export const SMART_LABEL_ALGORITHM_VERSION = 4 as const;

const EMPTY_CACHE: SmartLabelCache = { version: 4, conversations: {} };

let cache: SmartLabelCache = structuredClone(EMPTY_CACHE);
let writeQueued = false;
let cacheGeneration = 0;
let isSubscribed = false;

/** Loads and prunes the Smart Label cache before first render. */
export async function initializeSmartLabelStore(now = Date.now()): Promise<void> {
  cacheGeneration += 1;
  const result = await chrome.storage.local.get(STORAGE_KEY);
  cache = normalizeCache(result[STORAGE_KEY]);
  subscribeToExternalChanges();
  if (pruneCache(cache, now)) await persistCache();
}

/** Returns a cached label without reading or storing source prompt content. */
export function getStoredSmartLabel(
  conversationKey: string,
  messageId: string,
  now = Date.now(),
  sourceSignature?: string
): string | null {
  return getSmartLabelCacheLookup(
    conversationKey,
    messageId,
    now,
    sourceSignature
  ).label;
}

export interface SmartLabelCacheLookup {
  label: string | null;
  status: 'hit' | 'miss' | 'stale' | 'unverifiable';
}

/** Returns a cache value together with an explicit validation outcome. */
export function getSmartLabelCacheLookup(
  conversationKey: string,
  messageId: string,
  now = Date.now(),
  sourceSignature?: string
): SmartLabelCacheLookup {
  const conversation = cache.conversations[conversationKey];
  const storedLabel = conversation?.labels[messageId];
  if (!conversation || !storedLabel) return { label: null, status: 'miss' };
  if (!sourceSignature || !storedLabel.sourceSignature) {
    return { label: null, status: 'unverifiable' };
  }
  if (storedLabel.sourceSignature !== sourceSignature) {
    return { label: null, status: 'stale' };
  }

  const oneDayMs = 24 * 60 * 60 * 1_000;
  if (now - conversation.lastAccessedAt >= oneDayMs) {
    conversation.lastAccessedAt = now;
    queuePersist();
  }
  return { label: storedLabel.label, status: 'hit' };
}

/** Stores a derived label under its stable conversation and message IDs. */
export function storeSmartLabel(
  conversationKey: string,
  messageId: string,
  label: string,
  now = Date.now(),
  metadata: { sourceSignature?: string; decisionType?: string } = {}
): void {
  const conversation = cache.conversations[conversationKey] ?? {
    lastAccessedAt: now,
    labels: {},
  };
  conversation.lastAccessedAt = now;
  conversation.labels[messageId] = {
    label,
    updatedAt: now,
    algorithmVersion: SMART_LABEL_ALGORITHM_VERSION,
    sourceSignature: metadata.sourceSignature ?? '',
    decisionType: metadata.decisionType ?? 'legacy-call',
  };
  cache.conversations[conversationKey] = conversation;
  pruneCache(cache, now);
  queuePersist();
}

/** Removes every persisted Smart Label while leaving Raw/Smart preference intact. */
export async function clearSmartLabelCache(): Promise<void> {
  cacheGeneration += 1;
  cache = structuredClone(EMPTY_CACHE);
  writeQueued = false;
  await chrome.storage.local.remove(STORAGE_KEY);
}

function queuePersist(): void {
  if (writeQueued) return;
  writeQueued = true;
  const queuedGeneration = cacheGeneration;
  queueMicrotask(() => {
    writeQueued = false;
    if (queuedGeneration !== cacheGeneration) return;
    void persistCache();
  });
}

async function persistCache(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: cache });
}

function subscribeToExternalChanges(): void {
  if (isSubscribed) return;
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[STORAGE_KEY]) return;
    cacheGeneration += 1;
    cache = normalizeCache(changes[STORAGE_KEY].newValue);
  });
  isSubscribed = true;
}

function pruneCache(candidate: SmartLabelCache, now: number): boolean {
  let changed = false;
  const conversations = Object.entries(candidate.conversations);

  conversations.forEach(([conversationKey, conversation]) => {
    if (now - conversation.lastAccessedAt > SMART_LABEL_CACHE_LIMITS.maximumAgeMs) {
      delete candidate.conversations[conversationKey];
      changed = true;
      return;
    }

    const labels = Object.entries(conversation.labels).sort(
      ([, left], [, right]) => right.updatedAt - left.updatedAt
    );
    labels.slice(SMART_LABEL_CACHE_LIMITS.maximumLabelsPerConversation).forEach(
      ([messageId]) => {
        delete conversation.labels[messageId];
        changed = true;
      }
    );
  });

  Object.entries(candidate.conversations)
    .sort(([, left], [, right]) => right.lastAccessedAt - left.lastAccessedAt)
    .slice(SMART_LABEL_CACHE_LIMITS.maximumConversations)
    .forEach(([conversationKey]) => {
      delete candidate.conversations[conversationKey];
      changed = true;
    });

  return changed;
}

function normalizeCache(value: unknown): SmartLabelCache {
  if (!value || typeof value !== 'object') return structuredClone(EMPTY_CACHE);
  const candidate = value as Partial<SmartLabelCache>;
  if (
    candidate.version !== 4 ||
    !candidate.conversations ||
    typeof candidate.conversations !== 'object'
  ) {
    return structuredClone(EMPTY_CACHE);
  }

  const conversations: Record<string, StoredConversationLabels> = {};
  Object.entries(candidate.conversations).forEach(([conversationKey, value]) => {
    if (!value || typeof value !== 'object') return;
    const conversation = value as Partial<StoredConversationLabels>;
    if (
      typeof conversation.lastAccessedAt !== 'number' ||
      !conversation.labels ||
      typeof conversation.labels !== 'object'
    ) {
      return;
    }

    const labels: Record<string, StoredLabel> = {};
    Object.entries(conversation.labels).forEach(([messageId, labelValue]) => {
      if (!labelValue || typeof labelValue !== 'object') return;
      const label = labelValue as Partial<StoredLabel>;
      if (
        typeof label.label !== 'string' ||
        typeof label.updatedAt !== 'number' ||
        label.algorithmVersion !== SMART_LABEL_ALGORITHM_VERSION ||
        typeof label.sourceSignature !== 'string' ||
        typeof label.decisionType !== 'string'
      ) {
        return;
      }
      labels[messageId] = {
        label: label.label,
        updatedAt: label.updatedAt,
        algorithmVersion: SMART_LABEL_ALGORITHM_VERSION,
        sourceSignature: label.sourceSignature,
        decisionType: label.decisionType,
      };
    });
    conversations[conversationKey] = {
      lastAccessedAt: conversation.lastAccessedAt,
      labels,
    };
  });
  return { version: 4, conversations };
}
