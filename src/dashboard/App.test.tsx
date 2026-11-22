import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { chromeFake } from "../../tests/fakes/chrome";
import { makeJob } from "../../tests/factories";
import { jobKey } from "../storage/chromeStorage";
import { createJob } from "../storage/jobRepository";
import { App } from "./App";

function statValue(label: string): string | null {
  const term = screen
    .getAllByText(label, { selector: "dt" })
    .find((element) => element.closest("dl")?.checkVisibility?.() !== false);
  return term?.parentElement?.querySelector("dd")?.textContent ?? null;
}

describe("Dashboard overview", () => {
  it("shows the hero and real zero statistics with empty states when nothing is saved", async () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: /your next opportunity starts here/i }),
    ).toBeInTheDocument();
    await waitFor(() => expect(statValue("Tracked")).toBe("0"));
    expect(statValue("Applied this week")).toBe("0");
    expect(statValue("Interviews")).toBe("0");
    expect(statValue("Due in 7 days")).toBe("0");
    expect(screen.getByText("Nothing saved yet")).toBeInTheDocument();
    expect(screen.getByText("No upcoming deadlines")).toBeInTheDocument();
  });

  it("derives statistics and panels from stored jobs", async () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const date = soon.toISOString().slice(0, 10);
    const dated = makeJob({
      title: "Data Engineer Intern",
      company: "Groww",
      savedAt: new Date().toISOString(),
      deadline: { date, origin: "user" },
    });
    const undated = makeJob({
      title: "SQL Analyst",
      company: "Paytm",
      savedAt: new Date().toISOString(),
    });
    const interview = makeJob({ status: "interview", savedAt: new Date().toISOString() });
    await chromeFake().storage.local.set({
      [jobKey(dated.id)]: dated,
      [jobKey(undated.id)]: undated,
      [jobKey(interview.id)]: interview,
    });

    render(<App />);

    await waitFor(() => expect(statValue("Tracked")).toBe("3"));
    expect(statValue("Interviews")).toBe("1");
    expect(statValue("Due in 7 days")).toBe("1");

    const recent = screen.getByRole("region", { name: /recently saved/i });
    expect(within(recent).getByText("Data Engineer Intern")).toBeInTheDocument();
    expect(within(recent).getByText("SQL Analyst")).toBeInTheDocument();

    const deadlines = screen.getByRole("region", { name: /upcoming deadlines/i });
    expect(within(deadlines).getByText("Data Engineer Intern")).toBeInTheDocument();
    expect(
      within(deadlines).getByText("2 saved jobs have no deadline provided"),
    ).toBeInTheDocument();
  });

  it("updates live when a job is saved from another extension page (the popup)", async () => {
    render(<App />);
    await waitFor(() => expect(statValue("Tracked")).toBe("0"));

    await createJob({
      title: "Graduate Trainee",
      company: "TCS",
      url: "https://example.com/gt",
      deadlineDate: "",
      deadlineTime: "",
    });

    await waitFor(() => expect(statValue("Tracked")).toBe("1"));
    expect(
      within(screen.getByRole("region", { name: /recently saved/i })).getByText("Graduate Trainee"),
    ).toBeInTheDocument();
  });

  it("adds an application from the dashboard without any job page", async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(statValue("Tracked")).toBe("0"));

    // The hero button; the Recently saved empty state offers the same action.
    await user.click(screen.getAllByRole("button", { name: /add an application/i })[0]!);
    const dialog = await screen.findByRole("dialog", { name: /add an application/i });
    expect(within(dialog).getByLabelText(/job title/i)).toHaveFocus();

    await user.click(within(dialog).getByRole("button", { name: /save application/i }));
    expect(within(dialog).getByText("Enter the job title.")).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/job title/i), "Python Developer Intern");
    await user.type(within(dialog).getByLabelText(/company/i), "Postman");
    await user.type(within(dialog).getByLabelText(/job url/i), "https://postman.com/careers/1");
    await user.click(within(dialog).getByRole("button", { name: /save application/i }));

    await waitFor(() => expect(statValue("Tracked")).toBe("1"));
    expect(
      await screen.findByText(/saved “python developer intern” at postman/i),
    ).toBeInTheDocument();
  });
});

describe("Add application dialog", () => {
  it("closes on cancel (Escape) and discards what was typed", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Add application" }));
    const dialog = await screen.findByRole("dialog", { name: /add an application/i });
    await user.type(within(dialog).getByLabelText(/job title/i), "Half-typed");

    fireEvent(dialog, new Event("cancel", { cancelable: true }));

    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    await user.click(screen.getByRole("button", { name: "Add application" }));
    expect(within(dialog).getByLabelText(/job title/i)).toHaveValue("");
    expect(storedJobCount()).toBe(0);
  });
});

function storedJobCount() {
  return Object.keys(chromeFake().storage.local.snapshot()).filter((key) => key.startsWith("job:"))
    .length;
}

describe("Dashboard navigation", () => {
  it("renders each route's page and marks the current link", async () => {
    const user = userEvent.setup();
    render(<App />);
    const nav = screen.getAllByRole("navigation", { name: "Main" })[0]!;

    for (const [name, text] of [
      ["Applications", /drag a card between stages/i],
      ["Calendar", "The calendar arrives in Phase 5"],
      ["Settings", "Your data"],
    ] as const) {
      await user.click(within(nav).getByRole("link", { name }));
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      expect(await screen.findByText(text)).toBeInTheDocument();
      expect(within(nav).getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    }
  });
});
