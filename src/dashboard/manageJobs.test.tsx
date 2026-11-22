import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { chromeFake } from "../../tests/fakes/chrome";
import { makeJob } from "../../tests/factories";
import type { JobApplication } from "../core/model/types";
import { jobKey } from "../storage/chromeStorage";
import { App } from "./App";

function statValue(label: string): string | null {
  const term = screen.getAllByText(label, { selector: "dt" }).find(Boolean);
  return term?.parentElement?.querySelector("dd")?.textContent ?? null;
}

async function seed(job: JobApplication) {
  await chromeFake().storage.local.set({ [jobKey(job.id)]: job });
}

describe("Job management", () => {
  it("edits a job from the overview and the statistics follow the change", async () => {
    const user = userEvent.setup();
    const job = makeJob({
      title: "Data Analyst Intern",
      company: "Zomato",
      savedAt: new Date().toISOString(),
    });
    await seed(job);
    render(<App />);

    await waitFor(() => expect(statValue("Tracked")).toBe("1"));
    await user.click(screen.getByRole("button", { name: /data analyst intern/i }));

    const drawer = await screen.findByRole("dialog", { name: /data analyst intern/i });
    expect(within(drawer).getByText("No deadline provided")).toBeInTheDocument();

    await user.click(within(drawer).getByRole("button", { name: "Edit" }));
    const title = await within(drawer).findByLabelText(/job title/i);
    await user.clear(title);
    await user.type(title, "SQL Developer Intern");
    await user.type(within(drawer).getByLabelText(/^city/i), "Bengaluru");
    await user.selectOptions(within(drawer).getByLabelText(/india eligibility/i), "india_hybrid");
    await user.selectOptions(within(drawer).getByLabelText(/^status/i), "interview");
    await user.click(within(drawer).getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/updated “sql developer intern”/i)).toBeInTheDocument();
    await waitFor(() => expect(statValue("Interviews")).toBe("1"));
    expect(screen.getByRole("button", { name: /sql developer intern/i })).toBeInTheDocument();

    const stored = Object.values(chromeFake().storage.local.snapshot()).find(
      (value) => typeof value === "object" && value !== null && "title" in value,
    ) as JobApplication;
    expect(stored).toMatchObject({
      title: "SQL Developer Intern",
      deadline: null,
      status: "interview",
      location: { city: "Bengaluru" },
      eligibility: { value: "india_hybrid", overridden: true },
    });
    expect(stored.savedAt).toBe(job.savedAt);
  });

  it("asks before deleting and updates the overview only after confirmation", async () => {
    const user = userEvent.setup();
    const job = makeJob({
      title: "Python Intern",
      company: "Postman",
      savedAt: new Date().toISOString(),
    });
    await seed(job);
    render(<App />);
    await waitFor(() => expect(statValue("Tracked")).toBe("1"));

    await user.click(screen.getByRole("button", { name: /python intern/i }));
    const drawer = await screen.findByRole("dialog", { name: /python intern/i });
    await user.click(within(drawer).getByRole("button", { name: "Delete" }));

    const confirm = await screen.findByRole("dialog", { name: /delete this application/i });
    await user.click(within(confirm).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(confirm).not.toHaveAttribute("open"));
    expect(statValue("Tracked")).toBe("1");

    await user.click(within(drawer).getByRole("button", { name: "Delete" }));
    await user.click(await screen.findByRole("button", { name: "Delete application" }));

    await waitFor(() => expect(statValue("Tracked")).toBe("0"));
    expect(screen.getByText("Nothing saved yet")).toBeInTheDocument();
    expect(chromeFake().storage.local.snapshot()[jobKey(job.id)]).toBeUndefined();
  });

  it("warns in the add dialog and does not overwrite the existing application", async () => {
    const user = userEvent.setup();
    const job = makeJob({
      title: "Analyst",
      company: "Acme",
      url: "https://example.com/jobs/7",
      savedAt: new Date().toISOString(),
    });
    await seed(job);
    render(<App />);
    await waitFor(() => expect(statValue("Tracked")).toBe("1"));

    await user.click(screen.getAllByRole("button", { name: /add an application/i })[0]!);
    const dialog = await screen.findByRole("dialog", { name: /add an application/i });
    await user.type(within(dialog).getByLabelText(/job title/i), "Analyst");
    await user.type(within(dialog).getByLabelText(/company/i), "Acme");
    await user.type(within(dialog).getByLabelText(/job url/i), "https://example.com/jobs/7");
    await user.click(within(dialog).getByRole("button", { name: /save application/i }));

    expect(await within(dialog).findByText(/already saved on/i)).toBeInTheDocument();
    expect(statValue("Tracked")).toBe("1");

    await user.click(within(dialog).getByRole("button", { name: /save anyway/i }));
    await waitFor(() => expect(statValue("Tracked")).toBe("2"));
    const titles = Object.values(chromeFake().storage.local.snapshot())
      .filter(
        (value): value is JobApplication =>
          typeof value === "object" && value !== null && "title" in value,
      )
      .map((stored) => stored.title);
    expect(titles.filter((title) => title === "Analyst")).toHaveLength(2);
  });
});
