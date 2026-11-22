export async function openDashboard(target?: { jobId: string; edit?: boolean }): Promise<void> {
  const hash = target
    ? `#/applications?job=${encodeURIComponent(target.jobId)}${target.edit ? "&edit=1" : ""}`
    : "";
  await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") + hash });
  window.close();
}
