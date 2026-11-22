// Typed in-memory stand-in for the chrome.* APIs Job Clipper uses (PROJECT_SPEC section 20).
// No third-party mock library: behaviour mirrors Chrome closely enough for unit tests,
// including structured cloning of stored values and asynchronous onChanged delivery.
import { vi } from "vitest";

type StorageChanges = Record<string, { oldValue?: unknown; newValue?: unknown }>;
type AreaName = "local" | "session";

export class FakeEvent<Listener extends (...args: never[]) => unknown> {
  private listeners = new Set<Listener>();
  addListener = (listener: Listener) => void this.listeners.add(listener);
  removeListener = (listener: Listener) => void this.listeners.delete(listener);
  hasListener = (listener: Listener) => this.listeners.has(listener);
  get size() {
    return this.listeners.size;
  }
  emit(...args: Parameters<Listener>) {
    for (const listener of [...this.listeners]) listener(...args);
  }
}

class FakeStorageArea {
  private data = new Map<string, unknown>();
  readonly onChanged = new FakeEvent<(changes: StorageChanges) => void>();

  constructor(
    private readonly areaName: AreaName,
    private readonly broadcast: (changes: StorageChanges, area: AreaName) => void,
  ) {}

  async get(
    keys?: string | string[] | Record<string, unknown> | null,
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    const read = (key: string, fallback?: unknown) => {
      if (this.data.has(key)) result[key] = structuredClone(this.data.get(key));
      else if (fallback !== undefined) result[key] = fallback;
    };
    if (keys === null || keys === undefined) for (const key of this.data.keys()) read(key);
    else if (typeof keys === "string") read(keys);
    else if (Array.isArray(keys)) keys.forEach((key) => read(key));
    else Object.entries(keys).forEach(([key, fallback]) => read(key, fallback));
    return result;
  }

  async set(items: Record<string, unknown>): Promise<void> {
    const changes: StorageChanges = {};
    for (const [key, value] of Object.entries(items)) {
      const oldValue = this.data.get(key);
      const newValue = structuredClone(value);
      this.data.set(key, newValue);
      changes[key] = oldValue === undefined ? { newValue } : { oldValue, newValue };
    }
    this.dispatch(changes);
  }

  async remove(keys: string | string[]): Promise<void> {
    const changes: StorageChanges = {};
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      if (!this.data.has(key)) continue;
      changes[key] = { oldValue: this.data.get(key) };
      this.data.delete(key);
    }
    this.dispatch(changes);
  }

  async clear(): Promise<void> {
    await this.remove([...this.data.keys()]);
  }

  /** Test helper: synchronous snapshot of everything stored. */
  snapshot(): Record<string, unknown> {
    return structuredClone(Object.fromEntries(this.data));
  }

  private dispatch(changes: StorageChanges) {
    if (Object.keys(changes).length === 0) return;
    // Chrome delivers onChanged asynchronously, after the write's promise resolves.
    queueMicrotask(() => {
      this.onChanged.emit(changes);
      this.broadcast(changes, this.areaName);
    });
  }
}

export interface FakeTab {
  id?: number;
  url?: string;
  title?: string;
}

export function createChromeFake() {
  const onChanged = new FakeEvent<(changes: StorageChanges, areaName: string) => void>();
  const broadcast = (changes: StorageChanges, area: AreaName) => onChanged.emit(changes, area);
  let activeTab: FakeTab | undefined = { id: 1, url: "https://example.com/", title: "Example" };

  return {
    storage: {
      local: new FakeStorageArea("local", broadcast),
      session: new FakeStorageArea("session", broadcast),
      onChanged,
    },
    runtime: {
      id: "test-extension-id",
      getURL: (path: string) => `chrome-extension://test-extension-id/${path.replace(/^\//, "")}`,
      getManifest: () => ({ manifest_version: 3, name: "Job Clipper", version: "0.1.0" }),
      onInstalled: new FakeEvent<(details: chrome.runtime.InstalledDetails) => void>(),
    },
    tabs: {
      query: vi.fn(async (): Promise<FakeTab[]> => (activeTab ? [activeTab] : [])),
      create: vi.fn(async (props: { url?: string }) => ({ id: 99, ...props })),
    },
    /** Test helper: what chrome.tabs.query returns as the active tab (undefined = no tab). */
    setActiveTab(tab: FakeTab | undefined) {
      activeTab = tab;
    },
  };
}

export type ChromeFake = ReturnType<typeof createChromeFake>;

let current: ChromeFake | undefined;

export function installChromeFake(): ChromeFake {
  current = createChromeFake();
  (globalThis as unknown as { chrome: unknown }).chrome = current;
  return current;
}

export function chromeFake(): ChromeFake {
  if (!current) throw new Error("Chrome fake not installed");
  return current;
}
