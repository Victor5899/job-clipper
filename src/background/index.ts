import { isExtensionPageSender, parseTestNotificationRequest } from "../messaging/protocol";
import { handleRuntimeMessage } from "./extract";
import { handleInstalled } from "./lifecycle";
import {
  handleAlarm,
  handleNotificationClick,
  handleStorageChanged,
  reconcileReminders,
  sendTestNotification,
} from "./reconcile";

// MV3 requires listeners to be registered synchronously at the top level so events can wake
// the service worker. Registering only here also guarantees each listener is added once.
chrome.runtime.onInstalled.addListener((details) => {
  handleInstalled(details)
    .then(() => reconcileReminders())
    .catch((error: unknown) => {
      console.error("Job Clipper: install/update initialisation failed", error);
    });
});

chrome.runtime.onStartup.addListener(() => {
  void reconcileReminders().catch((error: unknown) => {
    console.error("Job Clipper: startup reminder reconcile failed", error);
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  void handleAlarm(alarm).catch((error: unknown) => {
    console.error("Job Clipper: alarm failed", error);
  });
});

chrome.notifications.onClicked.addListener((notificationId) => {
  void handleNotificationClick(notificationId).catch((error: unknown) => {
    console.error("Job Clipper: opening the job from a notification failed", error);
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  handleStorageChanged(changes, area);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isExtensionPageSender(sender)) return undefined;
  const pending = handleRuntimeMessage(message, sender);
  if (pending) {
    pending.then(sendResponse).catch((error: unknown) => {
      console.error("Job Clipper: extraction failed", error);
      sendResponse({ ok: false, reason: "failed" });
    });
    return true;
  }
  if (parseTestNotificationRequest(message)) {
    sendTestNotification()
      .then(sendResponse)
      .catch((error: unknown) => {
        console.error("Job Clipper: test notification failed", error);
        sendResponse({ ok: false, reason: "unavailable" });
      });
    return true;
  }
  return undefined;
});

void reconcileReminders().catch((error: unknown) => {
  console.error("Job Clipper: reminder reconcile failed", error);
});
