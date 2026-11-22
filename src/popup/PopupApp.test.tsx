import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { chromeFake } from "../../tests/fakes/chrome";
import type { JobApplication } from "../core/model/types";
import { PopupApp } from "./PopupApp";

function storedJobs(): JobApplication[] {
  return Object.entries(chromeFake().storage.local.snapshot())
    .filter(([key]) => key.startsWith("job:"))
    .map(([, value]) => value as JobApplication);
}

async function renderPopup() {
  const user = userEvent.setup();
  const view = render(<PopupApp />);
  await screen.findByRole("heading", { name: /clip this job/i });
  return { user, ...view };
}

describe("PopupApp", () => {
  it("prefills the URL and title from the active tab", async () => {
    chromeFake().setActiveTab({
      id: 3,
      url: "https://internshala.com/internship/detail/data-analyst-intern",
      title: "Data Analyst Intern at Acme",
    });
    await renderPopup();

    expect(screen.getByLabelText(/job url/i)).toHaveValue(
      "https://internshala.com/internship/detail/data-analyst-intern",
    );
    expect(screen.getByLabelText(/job title/i)).toHaveValue("Data Analyst Intern at Acme");
    expect(screen.getByLabelText(/company/i)).toHaveValue("");
  });

  it("keeps manual entry working on restricted pages without prefilling", async () => {
    chromeFake().setActiveTab({ id: 4, url: "chrome://extensions/", title: "Extensions" });
    const { user } = await renderPopup();

    expect(screen.getByText(/isn't a regular web page/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job url/i)).toHaveValue("");
    expect(screen.getByLabelText(/job title/i)).toHaveValue("");

    await user.type(screen.getByLabelText(/job title/i), "SQL Developer Intern");
    await user.type(screen.getByLabelText(/company/i), "Zoho");
    await user.type(screen.getByLabelText(/job url/i), "https://careers.zoho.com/jobs/1");
    await user.click(screen.getByRole("button", { name: /save to job clipper/i }));

    expect(
      await screen.findByRole("heading", { name: /saved to job clipper/i }),
    ).toBeInTheDocument();
    expect(storedJobs()).toHaveLength(1);
  });

  it("works when Chrome reports no active tab at all", async () => {
    chromeFake().setActiveTab(undefined);
    await renderPopup();
    expect(screen.getByLabelText(/job url/i)).toHaveValue("");
    expect(screen.getByRole("button", { name: /save to job clipper/i })).toBeEnabled();
  });

  it("shows validation messages and saves nothing when required fields are missing", async () => {
    chromeFake().setActiveTab({ id: 5, url: "chrome://newtab/" });
    const { user } = await renderPopup();

    await user.click(screen.getByRole("button", { name: /save to job clipper/i }));

    expect(screen.getByText("Enter the job title.")).toBeInTheDocument();
    expect(screen.getByText("Enter the company name.")).toBeInTheDocument();
    expect(screen.getByText("Enter the link to the job listing.")).toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toHaveFocus();
    expect(screen.getByLabelText(/job title/i)).toHaveAttribute("aria-invalid", "true");
    expect(storedJobs()).toHaveLength(0);
  });

  it("rejects a non-http URL", async () => {
    chromeFake().setActiveTab({ id: 5, url: "chrome://newtab/" });
    const { user } = await renderPopup();

    await user.type(screen.getByLabelText(/job title/i), "Intern");
    await user.type(screen.getByLabelText(/company/i), "Acme");
    await user.type(screen.getByLabelText(/job url/i), "javascript:alert(1)");
    await user.click(screen.getByRole("button", { name: /save to job clipper/i }));

    expect(
      screen.getByText("Enter a full web address starting with http:// or https://."),
    ).toBeInTheDocument();
    expect(storedJobs()).toHaveLength(0);
  });

  it("saves a job without a deadline and shows 'No deadline provided'", async () => {
    chromeFake().setActiveTab({
      id: 6,
      url: "https://www.linkedin.com/jobs/view/42/",
      title: "Data Engineer",
    });
    const { user } = await renderPopup();

    expect(screen.getByText("No deadline provided")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/company/i), "Flipkart");
    await user.click(screen.getByRole("button", { name: /save to job clipper/i }));

    await screen.findByRole("heading", { name: /saved to job clipper/i });
    expect(screen.getByText("No deadline provided")).toBeInTheDocument();
    const [job] = storedJobs();
    expect(job).toMatchObject({
      title: "Data Engineer",
      company: "Flipkart",
      source: "linkedin",
      deadline: null,
    });
  });

  it("saves a job with a deadline", async () => {
    chromeFake().setActiveTab({ id: 6, url: "https://example.com/job", title: "Analyst" });
    const { user } = await renderPopup();

    await user.type(screen.getByLabelText(/company/i), "Acme");
    await user.type(screen.getByLabelText(/^deadline/i), "2026-12-15");
    await user.click(screen.getByRole("button", { name: /save to job clipper/i }));

    await screen.findByRole("heading", { name: /saved to job clipper/i });
    expect(screen.getByText(/due 15 dec 2026/i)).toBeInTheDocument();
    expect(storedJobs()[0]?.deadline).toEqual({ date: "2026-12-15", origin: "user" });
  });

  it("restores a draft after the popup is closed and reopened, then clears it on save", async () => {
    chromeFake().setActiveTab({ id: 9, url: "https://example.com/job", title: "Analyst" });
    const first = await renderPopup();
    await first.user.type(screen.getByLabelText(/company/i), "Meesho");
    await first.user.clear(screen.getByLabelText(/job title/i));
    await first.user.type(screen.getByLabelText(/job title/i), "BI Intern");
    first.unmount(); // Chrome closes the popup when it loses focus.

    await waitFor(() =>
      expect(chromeFake().storage.session.snapshot()["popupDraft:9"]).toMatchObject({
        values: { company: "Meesho", title: "BI Intern" },
      }),
    );

    const second = await renderPopup();
    expect(screen.getByText(/restored your unsaved entry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company/i)).toHaveValue("Meesho");
    expect(screen.getByLabelText(/job title/i)).toHaveValue("BI Intern");

    await second.user.click(screen.getByRole("button", { name: /save to job clipper/i }));
    await screen.findByRole("heading", { name: /saved to job clipper/i });
    expect(chromeFake().storage.session.snapshot()).toEqual({});
  });

  it("opens the dashboard in a new tab", async () => {
    const close = vi.spyOn(window, "close").mockImplementation(() => {});
    const { user } = await renderPopup();

    // Header icon button; the footer has a labelled button with the same action.
    const [headerButton, footerButton] = screen.getAllByRole("button", { name: "Open dashboard" });
    expect(footerButton).toBeDefined();
    await user.click(headerButton!);

    expect(chromeFake().tabs.create).toHaveBeenCalledWith({
      url: "chrome-extension://test-extension-id/dashboard.html",
    });
    await waitFor(() => expect(close).toHaveBeenCalled());
  });
});
