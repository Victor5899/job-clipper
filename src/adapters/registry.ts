import type { SourceId } from "../core/model/enums";
import { internshalaAdapter } from "./sites/internshala";
import { linkedInAdapter } from "./sites/linkedin";
import { naukriAdapter } from "./sites/naukri";
import type { SiteAdapter } from "./types";

/** Priority order from the specification. Disabled adapters are not selected. */
export const SITE_ADAPTERS: readonly SiteAdapter[] = [
  internshalaAdapter,
  linkedInAdapter,
  naukriAdapter,
];

export function adapterFor(url: URL): SiteAdapter | undefined {
  return SITE_ADAPTERS.find((adapter) => adapter.enabled && adapter.matches(url));
}

export function adapterById(id: SourceId): SiteAdapter | undefined {
  return SITE_ADAPTERS.find((adapter) => adapter.id === id);
}
