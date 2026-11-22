import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { navigate, parseHash, routeHref, useRoute } from "./router";

describe("parseHash", () => {
  it.each([
    ["", "overview"],
    ["#", "overview"],
    ["#/", "overview"],
    ["#/overview", "overview"],
    ["#/applications", "applications"],
    ["#/calendar", "calendar"],
    ["#/settings", "settings"],
    ["#/SETTINGS", "settings"],
    ["#settings", "settings"],
    ["#/job/123", "overview"],
    ["#/does-not-exist", "overview"],
  ])("maps %j to %s", (hash, name) => {
    expect(parseHash(hash).name).toBe(name);
  });

  it("opens the job sheet from a notification hash", () => {
    const route = parseHash("#/job/job-42");
    expect(route.name).toBe("overview");
    expect(route.params.get("job")).toBe("job-42");
  });

  it("parses query parameters", () => {
    const route = parseHash("#/applications?status=saved&q=data%20engineer");
    expect(route.name).toBe("applications");
    expect(route.params.get("status")).toBe("saved");
    expect(route.params.get("q")).toBe("data engineer");
  });

  it("builds hrefs for routes", () => {
    expect(routeHref("calendar")).toBe("#/calendar");
  });
});

describe("useRoute", () => {
  it("follows hash changes", () => {
    const { result } = renderHook(() => useRoute());
    expect(result.current.name).toBe("overview");

    act(() => {
      navigate("settings");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(result.current.name).toBe("settings");
    expect(window.location.hash).toBe("#/settings");
  });
});
