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

  it("leaves descriptions off when that checkbox was never saved", async () => {
    await chromeFake().storage.local.set({
      settings: {
        reminders: DEFAULT_SETTINGS.reminders,
        profile: DEFAULT_SETTINGS.profile,
        csv: { includeDescription: false },
      },
      schemaVersion: 1,
    });

    await handleInstalled({ reason: "update" } as chrome.runtime.InstalledDetails);

    const stored = await chromeFake().storage.local.get("settings");
    expect(stored.settings).toMatchObject({
      csv: { includeDescription: false, chosen: true },
      profile: DEFAULT_SETTINGS.profile,
    });
  });

  it("keeps a saved choice to leave descriptions out of the CSV", async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      csv: { includeDescription: false, chosen: true },
    };
    await chromeFake().storage.local.set({ settings, schemaVersion: 1 });

    await handleInstalled({ reason: "update" } as chrome.runtime.InstalledDetails);

    expect((await chromeFake().storage.local.get("settings")).settings).toEqual(settings);
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
