import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeJob } from "../../../tests/factories";
import { CalendarPage } from "./CalendarPage";

describe("CalendarPage", () => {
  it("shows deadlines on the month grid and deadline-less jobs only in the agenda", async () => {
    const user = userEvent.setup();
    const onOpenJob = vi.fn();
    const now = new Date(2026, 10, 22, 12, 0, 0);
    const dated = makeJob({
      id: "dated",
      title: "Data Engineer Intern",
      company: "Groww",
      deadline: { date: "2026-11-25", origin: "user" },
    });
    const undated = makeJob({
      id: "undated",
      title: "SQL Analyst",
      company: "Paytm",
      deadline: null,
    });

    render(<CalendarPage jobs={[dated, undated]} now={now} onOpenJob={onOpenJob} />);

    const grid = screen.getByRole("grid", { name: /november 2026/i });
    expect(within(grid).getByText("Data Engineer Intern")).toBeInTheDocument();
    expect(within(grid).queryByText("SQL Analyst")).not.toBeInTheDocument();

    const none = screen.getByRole("region", { name: "No deadline provided" });
    const undatedButton = within(none).getByRole("button", { name: /SQL Analyst/i });
    expect(undatedButton).toHaveTextContent("No deadline provided");
    expect(within(none).queryByText("Data Engineer Intern")).not.toBeInTheDocument();

    await user.click(screen.getByRole("gridcell", { name: /25 November 2026/i }));
    const day = screen.getByRole("region", { name: /25 November/i });
    expect(within(day).getByText("Data Engineer Intern")).toBeInTheDocument();
    await user.click(within(day).getByRole("button", { name: /Data Engineer Intern/i }));
    expect(onOpenJob).toHaveBeenCalledWith("dated");

    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { level: 2, name: "December 2026" })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: /december 2026/i })).toBeInTheDocument();
    expect(
      within(screen.getByRole("grid", { name: /december 2026/i })).queryByText(
        "Data Engineer Intern",
      ),
    ).not.toBeInTheDocument();
  });
});
