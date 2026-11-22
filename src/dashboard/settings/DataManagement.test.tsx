import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chromeFake } from "../../../tests/fakes/chrome";
import { makeJob } from "../../../tests/factories";
import { buildBackup, serializeBackup } from "../../core/backup/serialize";
import { DEFAULT_SETTINGS } from "../../core/model/defaults";
import { jobKey } from "../../storage/chromeStorage";
import { listJobs } from "../../storage/jobRepository";
import { DataManagement } from "./DataManagement";
import { SettingsPage } from "./SettingsPage";

beforeEach(() => {
  URL.createObjectURL = vi.fn((blob: Blob) => {
    (URL.createObjectURL as unknown as { last?: Blob }).last = blob;
    return "blob:test";
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});

async function lastDownload(): Promise<string> {
  const blob = (URL.createObjectURL as unknown as { last?: Blob }).last;
  expect(blob).toBeInstanceOf(Blob);
  const bytes = new Uint8Array(await blob!.arrayBuffer());
  expect(bytes.slice(0, 3)).toEqual(new Uint8Array([0xef, 0xbb, 0xbf]));
  return new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
}

describe("Settings data management", () => {
  it("keeps reminder settings and privacy next to export and backup", async () => {
    render(<SettingsPage jobCount={0} />);
    expect(await screen.findByRole("heading", { name: "Reminders" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your data" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Privacy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send test notification" })).toBeInTheDocument();
    expect(await screen.findByText(/of 10\.0 MB/)).toBeInTheDocument();
  });

  it("exports a CSV that follows the description checkbox", async () => {
    const user = userEvent.setup();
    const job = makeJob({
      id: "csv-job",
      title: "Visible title",
      description: "Hidden description marker",
    });
    await chromeFake().storage.local.set({ [jobKey(job.id)]: job, settings: DEFAULT_SETTINGS });
    render(<DataManagement jobCount={1} />);

    const checkbox = await screen.findByRole("checkbox", { name: /include job description/i });
    await waitFor(() => expect(checkbox).toBeEnabled());
    expect(checkbox).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Download CSV" }));
    const withoutDescription = await lastDownload();
    expect(withoutDescription.startsWith("\uFEFF")).toBe(true);
    expect(withoutDescription).toContain("Visible title");
    expect(withoutDescription).not.toContain("Description");
    expect(withoutDescription).not.toContain("Hidden description marker");

    await user.click(checkbox);
    await user.click(screen.getByRole("button", { name: "Download CSV" }));
    const withDescription = await lastDownload();
    expect(withDescription).toContain("Hidden description marker");
    const stored = await chromeFake().storage.local.get("settings");
    expect(stored.settings).toMatchObject({ csv: { includeDescription: true, chosen: true } });
  });

  it("refuses a broken backup and merges a valid one", async () => {
    const user = userEvent.setup();
    const localJob = makeJob({ id: "local", title: "Already here" });
    await chromeFake().storage.local.set({
      [jobKey(localJob.id)]: localJob,
      settings: DEFAULT_SETTINGS,
    });
    render(<DataManagement jobCount={1} />);

    const input = await screen.findByLabelText("Choose a backup file");
    await user.upload(input, new File(["{"], "bad.json", { type: "application/json" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/not valid JSON/i);
    expect(await screen.findByRole("alert")).toHaveTextContent(/nothing was changed/i);
    expect((await listJobs()).map((job) => job.id)).toEqual(["local"]);

    const incoming = makeJob({ id: "incoming", title: "From the file" });
    const text = serializeBackup(
      buildBackup([incoming], DEFAULT_SETTINGS, new Date("2026-11-22T00:00:00.000Z")),
    );
    await user.upload(
      input,
      new File([text], "job-clipper-backup-2026-11-22.json", { type: "application/json" }),
    );

    expect(
      (await screen.findAllByText(/keeps applications that are only on this device/i)).length,
    ).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Merge backup…" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/keeps applications that are only on this device/i),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Merge backup" }));

    await waitFor(async () => {
      expect((await listJobs()).map((job) => job.title).sort()).toEqual([
        "Already here",
        "From the file",
      ]);
    });
    expect(await screen.findByText(/Merged the backup/i)).toBeInTheDocument();
  });

  it("asks for REPLACE before a backup can wipe saved applications", async () => {
    const user = userEvent.setup();
    const localJob = makeJob({ id: "local", title: "Do not lose me yet" });
    await chromeFake().storage.local.set({
      [jobKey(localJob.id)]: localJob,
      settings: DEFAULT_SETTINGS,
    });
    render(<DataManagement jobCount={1} />);

    const incoming = makeJob({ id: "only-file", title: "Replacement" });
    const text = serializeBackup(
      buildBackup([incoming], DEFAULT_SETTINGS, new Date("2026-11-22T00:00:00.000Z")),
    );
    await user.upload(
      await screen.findByLabelText("Choose a backup file"),
      new File([text], "backup.json", { type: "application/json" }),
    );
    await user.click(
      await screen.findByRole("radio", { name: "Replace everything on this device" }),
    );
    expect(
      (await screen.findAllByText(/Replace removes every application/i)).length,
    ).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Replace all data…" }));

    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Replace all data" });
    expect(confirm).toBeDisabled();
    expect((await listJobs()).map((job) => job.id)).toEqual(["local"]);
    await user.type(within(dialog).getByLabelText("Type REPLACE to confirm"), "REPLACE");
    await user.click(confirm);

    await waitFor(async () => {
      expect((await listJobs()).map((job) => job.title)).toEqual(["Replacement"]);
    });
  });
});
