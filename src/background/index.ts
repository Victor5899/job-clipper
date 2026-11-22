import { handleInstalled } from "./lifecycle";

// MV3 requires listeners to be registered synchronously at the top level so events can wake
// the service worker; registering only here also guarantees each listener is added once.
chrome.runtime.onInstalled.addListener((details) => {
  handleInstalled(details).catch((error: unknown) => {
    console.error("Job Clipper: install/update initialisation failed", error);
  });
});
