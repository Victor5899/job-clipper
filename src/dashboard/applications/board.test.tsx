import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { chromeFake } from "../../../tests/fakes/chrome";
import { makeJob } from "../../../tests/factories";
import type { JobApplication } from "../../core/model/types";
import { jobKey } from "../../storage/chromeStorage";
import { App } from "../App";

function statValue(label: string): string | null {
  const term = screen
    .getAllByText(label, { selector: "dt" })
    .find((element) => element.closest("dl")?.checkVisibility?.() !== false);
  return term?.parentElement?.querySelector("dd")?.textContent ?? null;
}

function pipelineValue(stage: string): string | null {
  const panel = screen.getByRole("region", { name: /application overview/i });
  const term = within(panel).getByText(stage, { selector: "dt" });
  return term.parentElement?.querySelector("dd")?.textContent ?? null;
}

async function seed(job: JobApplication) {
  await chromeFake().storage.local.set({ [jobKey(job.id)]: job });
}

async function go(user: ReturnType<typeof userEvent.setup>, name: string) {
  const nav = screen.getAllByRole("navigation", { name: "Main" })[0]!;
  await user.click(within(nav).getByRole("link", { name }));
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

function stored(id: string): JobApplication {
  return chromeFake().storage.local.snapshot()[jobKey(id)] as JobApplication;
}

function analyst() {
  const job = makeJob({
    title: "Data Analyst Intern",
    company: "Zomato",
    savedAt: new Date().toISOString(),
    eligibility: {
      value: "india_hybrid",
      confidence: "low",
      reasons: [],
      overridden: true,
      classifierVersion: 0,
    },
  });
  return job;
}

describe("Kanban board", () => {
  it("renders four stages and each card's title, company, deadline and India eligibility", async () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 4);
    const dated = makeJob({
      title: "Data Engineer Intern",
      company: "Groww",
      savedAt: new Date().toISOString(),
      deadline: { date: soon.toISOString().slice(0, 10), origin: "user" },
      status: "applied",
    });
    const undated = analyst();
    await seed(dated);
    await seed(undated);
    const user = userEvent.setup();
    render(<App />);
    await go(user, "Applications");

    expect(
      await screen.findByRole("region", { name: /saved, 1 application/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /applied, 1 application/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /interview, 0 applications/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /result, 0 applications/i })).toBeInTheDocument();

    const saved = screen.getByRole("region", { name: /saved, 1 application/i });
    expect(within(saved).getByRole("button", { name: "Data Analyst Intern" })).toBeInTheDocument();
    expect(within(saved).getByText("Zomato")).toBeInTheDocument();
    expect(within(saved).getByText("No deadline provided")).toBeInTheDocument();
    expect(saved).toHaveTextContent("India — hybrid");
    expect(
      within(saved).getByRole("button", { name: "Drag Data Analyst Intern at Zomato" }),
    ).toBeInTheDocument();
    expect(
      within(saved).getByRole("combobox", { name: "Move to Data Analyst Intern at Zomato" }),
    ).toHaveValue("saved");

    const applied = screen.getByRole("region", { name: /applied, 1 application/i });
    expect(within(applied).getByText("Groww")).toBeInTheDocument();
    expect(within(applied).getByText(/^Due /)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Saved/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("persists a stage change from Move to, and the overview follows it after a reload", async () => {
    const user = userEvent.setup();
    const job = analyst();
    await seed(job);
    const first = render(<App />);
    await waitFor(() => expect(statValue("Tracked")).toBe("1"));
    await go(user, "Applications");

    await user.selectOptions(
      await screen.findByRole("combobox", { name: "Move to Data Analyst Intern at Zomato" }),
      "applied",
    );

    const applied = await screen.findByRole("region", { name: /applied, 1 application/i });
    expect(
      within(applied).getByRole("button", { name: "Data Analyst Intern" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /saved, 0 applications/i })).toBeInTheDocument();
    await waitFor(() => expect(stored(job.id).status).toBe("applied"));
    expect(stored(job.id).appliedAt).toBeTruthy();
    expect(stored(job.id).statusHistory.map((entry) => entry.status)).toEqual(["saved", "applied"]);
    expect(stored(job.id).title).toBe("Data Analyst Intern");
    expect(
      await screen.findByText(/moved “data analyst intern” at zomato to applied/i),
    ).toBeInTheDocument();

    first.unmount();
    render(<App />);
    await go(user, "Applications");
    expect(
      within(await screen.findByRole("region", { name: /applied, 1 application/i })).getByText(
        "Data Analyst Intern",
      ),
    ).toBeInTheDocument();

    await go(user, "Overview");
    await waitFor(() => expect(statValue("Applied this week")).toBe("1"));
    expect(pipelineValue("Applied")).toBe("1");
    expect(pipelineValue("Saved")).toBe("0");
  });

  it("moves the focused card to the next stage with the bracket key", async () => {
    const user = userEvent.setup();
    const job = analyst();
    await seed(job);
    render(<App />);
    await go(user, "Applications");

    const title = await screen.findByRole("button", { name: "Data Analyst Intern" });
    title.focus();
    await user.keyboard("]");

    await waitFor(() => expect(stored(job.id).status).toBe("applied"));
    expect(
      within(screen.getByRole("region", { name: /applied, 1 application/i })).getByRole("button", {
        name: "Data Analyst Intern",
      }),
    ).toBeInTheDocument();
  });

  it("asks for an outcome on Result and can leave it unset", async () => {
    const user = userEvent.setup();
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    const job = analyst();
    job.deadline = { date: soon.toISOString().slice(0, 10), origin: "user" };
    await seed(job);
    render(<App />);
    await waitFor(() => expect(statValue("Due in 7 days")).toBe("1"));
    await go(user, "Applications");

    await user.selectOptions(
      await screen.findByRole("combobox", { name: "Move to Data Analyst Intern at Zomato" }),
      "result",
    );
    const picker = await screen.findByRole("dialog", { name: /record an outcome/i });
    await user.click(within(picker).getByRole("button", { name: "Leave unset" }));

    const result = await screen.findByRole("region", { name: /result, 1 application/i });
    expect(within(result).getByText("Outcome not set", { selector: "p" })).toBeInTheDocument();
    await waitFor(() => expect(stored(job.id).status).toBe("result"));
    expect(stored(job.id).result).toBeUndefined();

    await user.selectOptions(
      within(result).getByRole("combobox", { name: "Outcome for Data Analyst Intern at Zomato" }),
      "rejected",
    );
    await waitFor(() => expect(stored(job.id).result).toBe("rejected"));
    expect(within(result).getByText("Rejected", { selector: "p" })).toBeInTheDocument();

    await go(user, "Overview");
    await waitFor(() => expect(statValue("Due in 7 days")).toBe("0"));
    expect(pipelineValue("Result")).toBe("1");
    expect(statValue("Interviews")).toBe("0");
  });

  it("offers an optional interview date and still saves the stage when skipped", async () => {
    const user = userEvent.setup();
    const job = analyst();
    await seed(job);
    render(<App />);
    await go(user, "Applications");

    await user.selectOptions(
      await screen.findByRole("combobox", { name: "Move to Data Analyst Intern at Zomato" }),
      "interview",
    );
    const dialog = await screen.findByRole("dialog", { name: /add an interview date/i });
    await user.click(within(dialog).getByRole("button", { name: "Skip" }));
    await waitFor(() => expect(stored(job.id).status).toBe("interview"));
    expect(stored(job.id).interviewAt).toBeUndefined();

    await go(user, "Overview");
    await waitFor(() => expect(statValue("Interviews")).toBe("1"));
    expect(pipelineValue("Interview")).toBe("1");
  });

  it("saves an interview date from the prompt without leaving the stage", async () => {
    const user = userEvent.setup();
    const job = analyst();
    await seed(job);
    render(<App />);
    await go(user, "Applications");
    await user.selectOptions(
      await screen.findByRole("combobox", { name: "Move to Data Analyst Intern at Zomato" }),
      "interview",
    );
    const dialog = await screen.findByRole("dialog", { name: /add an interview date/i });
    fireEvent.change(within(dialog).getByLabelText(/interview date/i), {
      target: { value: "2026-12-04" },
    });
    await user.click(within(dialog).getByRole("button", { name: "Save date" }));

    await waitFor(() => expect(stored(job.id).interviewAt).toBeTruthy());
    expect(stored(job.id).status).toBe("interview");
    expect(new Date(stored(job.id).interviewAt!).getDate()).toBe(4);
  });

  it("still opens the existing details and editor from a card", async () => {
    const user = userEvent.setup();
    const job = analyst();
    await seed(job);
    render(<App />);
    await go(user, "Applications");

    await user.click(await screen.findByRole("button", { name: "Data Analyst Intern" }));
    const drawer = await screen.findByRole("dialog", { name: /data analyst intern/i });
    expect(within(drawer).getByText("No deadline provided")).toBeInTheDocument();
    expect(within(drawer).getByText("India — hybrid")).toBeInTheDocument();

    await user.click(within(drawer).getByRole("button", { name: "Edit" }));
    const notes = await within(drawer).findByLabelText(/^notes/i);
    await user.type(notes, "Bring a SQL sample");
    await user.click(within(drawer).getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/updated “data analyst intern”/i)).toBeInTheDocument();
    await waitFor(() => expect(stored(job.id).notes).toBe("Bring a SQL sample"));
    expect(stored(job.id).status).toBe("saved");
  });
});
