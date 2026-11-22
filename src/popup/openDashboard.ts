export async function openDashboard(): Promise<void> {
  await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  window.close();
}
