import { describe, expect, it, vi } from "vitest";
import { chromeFake } from "../../tests/fakes/chrome";
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "../core/model/defaults";
import { handleInstalled } from "./lifecycle";

describe("handleInstalled", () => {
  it("initialises default settings and opens the dashboard on first install", async () => {
    await handleInstalled({ reason: "install" } as chrome.runtime.InstalledDetails);

    expect(chromeFake().storage.local.snapshot()).toEqual({
      settings: DEFAULT_SETTINGS,
      schemaVersion: SCHEMA_VERSION,
    });
    expect(chromeFake().tabs.create).toHaveBeenCalledWith({
      url: "chrome-extension://test-extension-id/dashboard.html",
    });
  });

  it("keeps existing settings and jobs on update and does not open a tab", async () => {
    const customised = {
      ...DEFAULT_SETTINGS,
      profile: { graduationYear: 2026, countryCode: "IN" },
    };
    await chromeFake().storage.local.set({
      settings: customised,
      schemaVersion: 1,
      "job:a": { id: "a" },
    });

    await handleInstalled({ reason: "update" } as chrome.runtime.InstalledDetails);

    expect(chromeFake().storage.local.snapshot()).toEqual({
      settings: customised,
      schemaVersion: 1,
      "job:a": { id: "a" },
    });
    expect(chromeFake().tabs.create).not.toHaveBeenCalled();
  });
});

describe("background entry point", () => {
  it("registers reminder listeners once at load time", async () => {
    vi.resetModules();
    await import("./index");
    const fake = chromeFake();
    expect(fake.runtime.onInstalled.size).toBe(1);
    expect(fake.runtime.onStartup.size).toBe(1);
    expect(fake.runtime.onMessage.size).toBe(1);
    expect(fake.alarms.onAlarm.size).toBe(1);
    expect(fake.notifications.onClicked.size).toBe(1);
    expect(fake.storage.onChanged.size).toBe(1);
  });
});
