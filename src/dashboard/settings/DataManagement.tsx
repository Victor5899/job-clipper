import { format } from "date-fns";
import { Download, HardDrive, Trash2, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { describeImport, planImport, sameImportPlan } from "../../core/backup/plan";
import { formatByteSize, MAX_BACKUP_BYTES, storageIsTight } from "../../core/backup/limits";
import type { BackupFile, ImportOptions } from "../../core/backup/types";
import { parseBackup } from "../../core/backup/validate";
import type { JobApplication } from "../../core/model/types";
import { applyImport, deleteAllStoredData, readStorageUsage } from "../../storage/backup";
import { listJobs } from "../../storage/jobRepository";
import { getSettings, saveCsvPreference } from "../../storage/settingsRepository";
import { Button } from "../../ui/components/Button";
import { Dialog } from "../../ui/components/Dialog";
import { downloadBackupFile, downloadJobsCsv } from "../exportCsv";

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "application" : "applications"}`;
}

export function DataManagement({ jobCount }: { jobCount: number }) {
  const importTitleId = useId();
  const deleteTitleId = useId();
  const noticeRef = useRef<HTMLDivElement>(null);
  const [includeDescription, setIncludeDescription] = useState(false);
  const [ready, setReady] = useState(false);
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  const [usageRevision, setUsageRevision] = useState(0);
  const [backup, setBackup] = useState<BackupFile | null>(null);
  const [storedJobs, setStoredJobs] = useState<JobApplication[] | null>(null);
  const [mode, setMode] = useState<ImportOptions["mode"]>("merge");
  const [onConflict, setOnConflict] = useState<ImportOptions["onConflict"]>("skip");
  const [replaceSettings, setReplaceSettings] = useState(false);
  const [pending, setPending] = useState<"import" | "delete" | null>(null);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (errors.length === 0 && !status) return;
    noticeRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [errors, status]);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((settings) => {
        if (!active) return;
        setIncludeDescription(settings.csv.includeDescription);
        setReady(true);
      })
      .catch(() => {
        if (active) setErrors(["Couldn't read settings."]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    readStorageUsage()
      .then((next) => {
        if (active) setUsage(next);
      })
      .catch(() => {
        if (active) setUsage(null);
      });
    return () => {
      active = false;
    };
  }, [jobCount, usageRevision]);

  useEffect(() => {
    if (!backup) return;
    let active = true;
    listJobs()
      .then((jobs) => {
        if (active) setStoredJobs(jobs);
      })
      .catch(() => {
        if (active) setErrors(["Couldn't read saved applications."]);
      });
    return () => {
      active = false;
    };
  }, [backup, jobCount]);

  const options: ImportOptions = { mode, onConflict, replaceSettings };
  const plan = backup && storedJobs ? planImport(storedJobs, backup, options) : null;
  const tight = usage ? storageIsTight(usage.used, usage.quota) : false;

  const exportCsv = async () => {
    setBusy(true);
    setErrors([]);
    try {
      try {
        await saveCsvPreference(includeDescription);
      } catch {
        setErrors(["Couldn't save the description option. The file still follows the checkbox."]);
      }
      const jobs = await listJobs();
      setStatus(downloadJobsCsv(jobs, includeDescription));
    } catch {
      setErrors(["Couldn't export a CSV."]);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const downloadBackup = async () => {
    setBusy(true);
    setErrors([]);
    try {
      const result = await downloadBackupFile();
      setStatus(result.message);
    } catch {
      setErrors(["Couldn't download a backup."]);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    setStatus(null);
    setErrors([]);
    setBackup(null);
    setStoredJobs(null);
    setPending(null);
    if (file.size > MAX_BACKUP_BYTES) {
      setErrors(["This file is larger than 5 MB.", "Nothing was changed."]);
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setErrors(["Couldn't read that file.", "Nothing was changed."]);
      return;
    }
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    try {
      setStoredJobs(await listJobs());
    } catch {
      setErrors(["Couldn't read saved applications.", "Nothing was changed."]);
      return;
    }
    setMode("merge");
    setOnConflict("skip");
    setReplaceSettings(false);
    setBackup(parsed.backup);
  };

  const confirmImport = async () => {
    if (!backup || !plan) return;
    if (mode === "replace" && phrase !== "REPLACE") return;
    setBusy(true);
    setErrors([]);
    try {
      const latest = await listJobs();
      const fresh = planImport(latest, backup, options);
      if (!sameImportPlan(fresh, plan)) {
        setStoredJobs(latest);
        setPending(null);
        setPhrase("");
        setErrors(["Saved applications changed. Read the updated summary, then confirm again."]);
        return;
      }
      await applyImport(fresh);
      const verb = fresh.summary.mode === "replace" ? "Replaced" : "Merged";
      setBackup(null);
      setStoredJobs(null);
      setPending(null);
      setPhrase("");
      setStatus(
        `${verb} the backup. Reminders are rescheduled from the applications now saved on this device.`,
      );
      setUsageRevision((value) => value + 1);
    } catch (error) {
      setErrors([
        error instanceof Error
          ? error.message
          : "Import did not finish. Review your applications before trying again.",
      ]);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (phrase !== "DELETE") return;
    setBusy(true);
    setErrors([]);
    try {
      await deleteAllStoredData();
      setBackup(null);
      setStoredJobs(null);
      setPending(null);
      setPhrase("");
      setIncludeDescription(false);
      setStatus("Deleted all saved applications and reset settings on this device.");
      setUsageRevision((value) => value + 1);
    } catch {
      setErrors(["Couldn't delete the saved data."]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {(errors.length > 0 || status) && (
        <div ref={noticeRef} className="flex flex-col gap-2">
          {errors.length > 0 && (
            <div role="alert" className="text-[12.5px] text-danger">
              <ul className="list-disc pl-4">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {status && <p className="text-[12.5px] text-text-muted">{status}</p>}
        </div>
      )}

      <section className="panel-surface flex gap-4 p-6">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-border-strong bg-surface-2 text-accent"
        >
          <HardDrive size={16} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-text">Your data</h2>
            <p className="mt-1.5 text-sm text-text-muted">
              {countLabel(jobCount)} stored in this browser. A CSV is for a spreadsheet. A JSON
              backup is the full copy used to restore this device.
            </p>
          </div>

          {usage ? (
            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12.5px]">
                <span className="text-text-muted">Extension storage</span>
                <span className="font-mono text-text">
                  {formatByteSize(usage.used)} of {formatByteSize(usage.quota)}
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-surface-2"
                role="meter"
                aria-label="Extension storage used"
                aria-valuemin={0}
                aria-valuemax={usage.quota}
                aria-valuenow={usage.used}
              >
                <div
                  className={`h-full rounded-full ${tight ? "bg-danger" : "bg-accent"}`}
                  style={{ width: `${Math.min(100, (usage.used / usage.quota) * 100)}%` }}
                />
              </div>
              {tight && (
                <p className="mt-2 text-[12.5px] text-danger">
                  Extension storage is past 70% of the 10 MB limit. Download a backup, then delete
                  applications you no longer need.
                </p>
              )}
            </div>
          ) : (
            <p className="text-[12.5px] text-text-muted">Storage size is unavailable.</p>
          )}

          <label className="flex items-start gap-2 text-[13px] font-medium text-text">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-accent"
              checked={includeDescription}
              disabled={!ready || busy}
              onChange={(event) => {
                setIncludeDescription(event.target.checked);
                setStatus(null);
              }}
            />
            <span>
              Include job description
              <span className="mt-1 block font-normal text-text-muted">
                Every other stored field is always a column. Leave this unchecked and the
                description column is left out of the file.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={!ready || busy}
              onClick={() => void exportCsv()}
            >
              <Download size={15} aria-hidden="true" />
              Download CSV
            </Button>
          </div>
          <p className="text-[12.5px] text-text-subtle">
            The file is named with today's date, uses commas, and starts with a UTF-8 mark so Excel
            and Google Sheets keep columns and characters such as ₹ aligned. Excel in a locale that
            expects semicolons can split the columns in the wrong places.
          </p>
        </div>
      </section>

      <section className="panel-surface flex gap-4 p-6">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-border-strong bg-surface-2 text-accent"
        >
          <Upload size={16} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-text">Backup and restore</h2>
            <p className="mt-1.5 text-sm text-text-muted">
              The backup contains every saved application and your reminder, profile and CSV
              settings. Import checks the file before it changes anything on this device. An invalid
              file, a future schema, or a file over 5 MB is refused.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            disabled={busy}
            onClick={() => void downloadBackup()}
          >
            <Download size={15} aria-hidden="true" />
            Download backup
          </Button>

          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text">
            Choose a backup file
            <input
              type="file"
              accept="application/json,.json"
              disabled={busy}
              className="text-sm font-normal text-text-muted file:mr-3 file:rounded-full file:border file:border-border-strong file:bg-surface-2 file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-text"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void chooseFile(file);
              }}
            />
          </label>

          {backup && plan && (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-text">
                Exported {format(new Date(backup.exportedAt), "d MMM yyyy, HH:mm")}. Schema{" "}
                {backup.schemaVersion}.
              </p>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-[13px] font-medium text-text">How to import</legend>
                <label className="flex items-center gap-2 text-[13px] text-text">
                  <input
                    type="radio"
                    name="jc-import-mode"
                    className="size-4 accent-accent"
                    checked={mode === "merge"}
                    onChange={() => setMode("merge")}
                  />
                  Merge with applications on this device
                </label>
                <label className="flex items-center gap-2 text-[13px] text-text">
                  <input
                    type="radio"
                    name="jc-import-mode"
                    className="size-4 accent-accent"
                    checked={mode === "replace"}
                    onChange={() => setMode("replace")}
                  />
                  Replace everything on this device
                </label>
              </fieldset>

              {mode === "merge" && (
                <>
                  <fieldset className="flex flex-col gap-2">
                    <legend className="text-[13px] font-medium text-text">
                      When the id or the link already exists
                    </legend>
                    <label className="flex items-center gap-2 text-[13px] text-text">
                      <input
                        type="radio"
                        name="jc-import-conflict"
                        className="size-4 accent-accent"
                        checked={onConflict === "skip"}
                        onChange={() => setOnConflict("skip")}
                      />
                      Keep the saved copy
                    </label>
                    <label className="flex items-center gap-2 text-[13px] text-text">
                      <input
                        type="radio"
                        name="jc-import-conflict"
                        className="size-4 accent-accent"
                        checked={onConflict === "overwrite"}
                        onChange={() => setOnConflict("overwrite")}
                      />
                      Use the copy in the file
                    </label>
                  </fieldset>
                  <label className="flex items-start gap-2 text-[13px] text-text">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-accent"
                      checked={replaceSettings}
                      onChange={(event) => setReplaceSettings(event.target.checked)}
                    />
                    <span>
                      Also replace reminder, profile and CSV settings
                      <span className="mt-1 block text-text-muted">
                        Leave this off and the settings on this device stay as they are.
                      </span>
                    </span>
                  </label>
                </>
              )}

              <div className="rounded-[10px] border border-border bg-surface-2/40 p-3 text-[13px] leading-relaxed text-text">
                {describeImport(plan.summary).map((line, index) => (
                  <p key={index} className="mt-1 first:mt-0">
                    {line}
                  </p>
                ))}
              </div>
              <Button
                variant={mode === "replace" ? "danger" : "primary"}
                size="sm"
                className="self-start"
                disabled={busy}
                onClick={() => {
                  setPhrase("");
                  setErrors([]);
                  setPending("import");
                }}
              >
                {mode === "replace" ? "Replace all data…" : "Merge backup…"}
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="panel-surface flex gap-4 p-6">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-border-strong bg-surface-2 text-danger"
        >
          <Trash2 size={16} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-text">Delete all data</h2>
            <p className="mt-1.5 text-sm text-text-muted">
              This deletes every saved application, resets reminder, profile and CSV settings, and
              clears unsaved popup drafts. Download a backup first if you want to keep them.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            className="self-start"
            disabled={busy}
            onClick={() => {
              setPhrase("");
              setErrors([]);
              setPending("delete");
            }}
          >
            Delete all data…
          </Button>
        </div>
      </section>

      <Dialog
        open={pending === "import" && plan !== null}
        title={mode === "replace" ? "Replace all data" : "Merge backup"}
        titleId={importTitleId}
        onClose={() => {
          if (!busy) setPending(null);
        }}
        footer={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant={mode === "replace" ? "danger" : "primary"}
              disabled={busy || (mode === "replace" && phrase !== "REPLACE")}
              onClick={() => void confirmImport()}
            >
              {busy ? "Working…" : mode === "replace" ? "Replace all data" : "Merge backup"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm leading-relaxed text-text-muted">
          {plan && describeImport(plan.summary).map((line, index) => <p key={index}>{line}</p>)}
          {mode === "replace" && (
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text">
              Type REPLACE to confirm
              <input
                value={phrase}
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
                className="h-10 rounded-[10px] border border-border-strong bg-surface-1 px-3 text-sm font-normal"
                onChange={(event) => setPhrase(event.target.value)}
              />
            </label>
          )}
        </div>
      </Dialog>

      <Dialog
        open={pending === "delete"}
        title="Delete all data"
        titleId={deleteTitleId}
        onClose={() => {
          if (!busy) setPending(null);
        }}
        footer={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={busy || phrase !== "DELETE"}
              onClick={() => void confirmDelete()}
            >
              {busy ? "Deleting…" : "Delete all data"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm leading-relaxed text-text-muted">
          <p>
            This deletes every saved application and resets settings on this device. Popup drafts
            are cleared too.
          </p>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text">
            Type DELETE to confirm
            <input
              value={phrase}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              className="h-10 rounded-[10px] border border-border-strong bg-surface-1 px-3 text-sm font-normal"
              onChange={(event) => setPhrase(event.target.value)}
            />
          </label>
        </div>
      </Dialog>
    </>
  );
}
