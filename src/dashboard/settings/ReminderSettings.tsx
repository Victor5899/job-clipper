import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { LEAD_DAY_PRESETS } from "../../core/reminders/computeRemindAt";
import type { Settings } from "../../core/model/types";
import { getSettings, reminderSettingsError, saveSettings } from "../../storage/settingsRepository";
import { Button } from "../../ui/components/Button";

const LEAD_LABELS: Record<(typeof LEAD_DAY_PRESETS)[number], string> = {
  0: "Same day at the chosen time",
  1: "1 day before",
  2: "2 days before",
  3: "3 days before",
  7: "7 days before",
};

export function ReminderSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [leadDays, setLeadDays] = useState("1");
  const [atTime, setAtTime] = useState("09:00");
  const [enabledByDefault, setEnabledByDefault] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((loaded) => {
        if (!active) return;
        setSettings(loaded);
        setLeadDays(String(loaded.reminders.leadDays));
        setAtTime(loaded.reminders.atTime);
        setEnabledByDefault(loaded.reminders.enabledByDefault);
      })
      .catch(() => {
        if (active) setError("Couldn't read reminder settings.");
      });
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    if (!settings) return;
    const reminders = {
      enabledByDefault,
      leadDays: Number(leadDays),
      atTime,
    };
    const invalid = reminderSettingsError(reminders);
    if (invalid) {
      setError(invalid);
      setNotice(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const next = { ...settings, reminders };
      await saveSettings(next);
      setSettings(next);
      setNotice("Reminder settings saved. Jobs using the default time will be rescheduled.");
    } catch {
      setError("Couldn't save reminder settings.");
      setNotice(null);
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setError(null);
    setNotice(null);
    try {
      const response: unknown = await chrome.runtime.sendMessage({ type: "jc:test-notification" });
      const ok =
        typeof response === "object" &&
        response !== null &&
        (response as { ok?: unknown }).ok === true;
      setNotice(
        ok
          ? "Test notification sent. If you don't see it, allow notifications for Google Chrome in System Settings."
          : "Couldn't send a test notification. Allow notifications for Google Chrome, then try again.",
      );
    } catch {
      setError("Couldn't reach the extension background to send a notification.");
    }
  };

  return (
    <section className="panel-surface flex gap-4 p-6">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full border border-border-strong bg-surface-2 text-accent"
      >
        <Bell size={16} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-text">Reminders</h2>
          <p className="mt-1.5 text-sm text-text-muted">
            A reminder is scheduled only when a job has a real deadline. The default is one day
            before at 09:00. Jobs you already saved keep their own reminder until you edit them.
          </p>
        </div>

        <label className="flex items-center gap-2 text-[13px] font-medium text-text">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={enabledByDefault}
            disabled={!settings || saving}
            onChange={(event) => {
              setEnabledByDefault(event.target.checked);
              setNotice(null);
            }}
          />
          Turn reminders on for new applications
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text">
            Default lead time
            <select
              className="h-10 rounded-[10px] border border-border-strong bg-surface-1 px-3 text-sm"
              value={leadDays}
              disabled={!settings || saving}
              onChange={(event) => {
                setLeadDays(event.target.value);
                setNotice(null);
              }}
            >
              {LEAD_DAY_PRESETS.map((days) => (
                <option key={days} value={days}>
                  {LEAD_LABELS[days]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text">
            Time
            <input
              type="time"
              className="h-10 rounded-[10px] border border-border-strong bg-surface-1 px-3 text-sm"
              value={atTime}
              disabled={!settings || saving}
              onChange={(event) => {
                setAtTime(event.target.value);
                setNotice(null);
              }}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            disabled={!settings || saving}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save reminder settings"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void sendTest()}>
            Send test notification
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-[12.5px] text-danger">
            {error}
          </p>
        )}
        {notice && <p className="text-[12.5px] text-text-muted">{notice}</p>}

        <p className="text-[12.5px] text-text-subtle">
          Chrome has to be running for a reminder to appear. If it was quit when one was due, Job
          Clipper shows a missed reminder the next time Chrome starts, as long as the deadline has
          not passed. On macOS, allow notifications for Google Chrome under System Settings →
          Notifications. Focus modes can hide them. Send test notification checks that permission.
          It is not a job reminder.
        </p>
      </div>
    </section>
  );
}
