import { initializeStorage } from "../storage/settingsRepository";

export async function handleInstalled(details: chrome.runtime.InstalledDetails): Promise<void> {
  await initializeStorage();
  if (details.reason === "install") {
    await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  }
}
