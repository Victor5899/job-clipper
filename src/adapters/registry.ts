import type { SourceId } from "../core/model/enums";
import { cutshortAdapter } from "./sites/cutshort";
import { himalayasAdapter } from "./sites/himalayas";
import { internshalaAdapter } from "./sites/internshala";
import { linkedInAdapter } from "./sites/linkedin";
import { naukriAdapter } from "./sites/naukri";
import { unstopAdapter } from "./sites/unstop";
import { weWorkRemotelyAdapter } from "./sites/weworkremotely";
import { wellfoundAdapter } from "./sites/wellfound";
import { yCombinatorAdapter } from "./sites/ycombinator";
import type { SiteAdapter } from "./types";

/** Priority order from the specification. Disabled adapters are not selected. */
export const SITE_ADAPTERS: readonly SiteAdapter[] = [
  internshalaAdapter,
  linkedInAdapter,
  naukriAdapter,
  wellfoundAdapter,
  yCombinatorAdapter,
  himalayasAdapter,
  weWorkRemotelyAdapter,
  unstopAdapter,
  cutshortAdapter,
];

export function adapterFor(url: URL): SiteAdapter | undefined {
  return SITE_ADAPTERS.find((adapter) => adapter.enabled && adapter.matches(url));
}

export function adapterById(id: SourceId): SiteAdapter | undefined {
  return SITE_ADAPTERS.find((adapter) => adapter.id === id);
}
