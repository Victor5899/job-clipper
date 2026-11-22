/** Import refuses a file larger than this. Chrome's local quota is larger (10 MB). */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

/** A sanity cap so a huge JSON array cannot stall the page. The byte cap still applies. */
export const MAX_BACKUP_JOBS = 10_000;

/** chrome.storage.local quota Job Clipper plans for. `unlimitedStorage` is not requested. */
export const STORAGE_QUOTA_BYTES = 10 * 1024 * 1024;

/** Settings warns once usage reaches this fraction of the quota. */
export const STORAGE_WARN_RATIO = 0.7;

export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function storageIsTight(used: number, quota = STORAGE_QUOTA_BYTES): boolean {
  return quota > 0 && used / quota >= STORAGE_WARN_RATIO;
}
