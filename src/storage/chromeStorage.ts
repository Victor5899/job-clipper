import type { ManualEntryValues } from "../core/model/manualEntry";
import type { JobApplication, Settings } from "../core/model/types";

export type JobKey = `job:${string}`;
export type DraftKey = `popupDraft:${string}`;

/** Everything Job Clipper keeps in chrome.storage.local (PROJECT_SPEC section 7). */
export interface LocalSchema {
  schemaVersion: number;
  settings: Settings;
  [key: JobKey]: JobApplication;
}

export interface PopupDraft {
  values: ManualEntryValues;
  updatedAt: string;
}

/** chrome.storage.session holds popup drafts only. */
export interface SessionSchema {
  [key: DraftKey]: PopupDraft;
}

export type StorageChanges<Schema> = {
  [K in keyof Schema]?: { oldValue?: Schema[K]; newValue?: Schema[K] };
};

const JOB_KEY_PREFIX = "job:";

export function jobKey(id: string): JobKey {
  return `${JOB_KEY_PREFIX}${id}`;
}

export function isJobKey(key: string): key is JobKey {
  return key.startsWith(JOB_KEY_PREFIX);
}

function typedArea<Schema extends object>(areaName: "local" | "session") {
  const area = () => chrome.storage[areaName];
  return {
    async get<K extends keyof Schema & string>(key: K): Promise<Schema[K] | undefined> {
      const items = (await area().get(key)) as Partial<Schema>;
      return items[key];
    },
    async getAll(): Promise<Partial<Schema>> {
      return (await area().get(null)) as Partial<Schema>;
    },
    async set(items: Partial<Schema>): Promise<void> {
      await area().set(items as Record<string, unknown>);
    },
    async remove(keys: (keyof Schema & string) | (keyof Schema & string)[]): Promise<void> {
      await area().remove(keys);
    },
    /** Subscribes to changes in this area only. Returns an unsubscribe function. */
    onChanged(listener: (changes: StorageChanges<Schema>) => void): () => void {
      const handler = (changes: Record<string, chrome.storage.StorageChange>, name: string) => {
        if (name === areaName) listener(changes as StorageChanges<Schema>);
      };
      chrome.storage.onChanged.addListener(handler);
      return () => chrome.storage.onChanged.removeListener(handler);
    },
  };
}

export const localStore = typedArea<LocalSchema>("local");
export const sessionStore = typedArea<SessionSchema>("session");
