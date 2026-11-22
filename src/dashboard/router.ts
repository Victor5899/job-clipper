import { useSyncExternalStore } from "react";

export const ROUTES = ["overview", "applications", "calendar", "settings"] as const;
export type RouteName = (typeof ROUTES)[number];

export const ROUTE_LABELS: Record<RouteName, string> = {
  overview: "Overview",
  applications: "Applications",
  calendar: "Calendar",
  settings: "Settings",
};

export interface Route {
  name: RouteName;
  params: URLSearchParams;
}

/** Parses "#/applications?status=saved" and "#/job/<id>" (the notification target). */
export function parseHash(hash: string): Route {
  const [path = "", query = ""] = hash.replace(/^#\/?/, "").split("?", 2);
  const segments = path.split("/").filter(Boolean);
  const head = segments[0]?.toLowerCase() ?? "";
  if (head === "job" && segments[1]) {
    const params = new URLSearchParams(query);
    params.set("job", decodeURIComponent(segments[1]));
    return { name: "overview", params };
  }
  return {
    name: (ROUTES as readonly string[]).includes(head) ? (head as RouteName) : "overview",
    params: new URLSearchParams(query),
  };
}

export function routeHref(name: RouteName): string {
  return `#/${name}`;
}

export function navigate(name: RouteName): void {
  replaceHash(routeHref(name));
}

/** Sets the hash and notifies listeners. jsdom does not always emit hashchange itself. */
export function replaceHash(hash: string): void {
  const next = hash.startsWith("#") ? hash : `#${hash}`;
  if (window.location.hash !== next) window.location.hash = next;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function hashForJob(
  route: RouteName,
  jobId: string,
  edit = false,
  current?: URLSearchParams,
): string {
  const params = new URLSearchParams(current);
  params.set("job", jobId);
  if (edit) params.set("edit", "1");
  else params.delete("edit");
  const query = params.toString();
  return `#/${route}${query ? `?${query}` : ""}`;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

const getHash = () => window.location.hash;

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash);
  return parseHash(hash);
}
