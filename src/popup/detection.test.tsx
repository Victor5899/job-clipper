import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { chromeFake } from "../../tests/fakes/chrome";
import { extractFromDocument } from "../adapters/pipeline";
import type { JobApplication } from "../core/model/types";
import { PopupApp } from "./PopupApp";

function storedJobs(): JobApplication[] {
  return Object.entries(chromeFake().storage.local.snapshot())
    .filter(([key]) => key.startsWith("job:"))
    .map(([, value]) => value as JobApplication);
}

const WFH_URL =
  "https://internshala.com/internship/detail/work-from-home-data-science-internship-at-codeatrix1794985193";

function detectInternshala() {
  const html = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../tests/fixtures/sites/internshala/wfh-apply-by.html",
    ),
    "utf8",
  );
  const doc = new DOMParser().parseFromString(html, "text/html");
  return extractFromDocument(doc, WFH_URL);
}

describe("popup detection", () => {
  it("shows an editable preview and saves only after the user confirms", async () => {
    const user = userEvent.setup();
    chromeFake().setActiveTab({ id: 8, url: WFH_URL, title: "Data Science Internship" });
    chromeFake().runtime.sendMessage.mockImplementation(async () => detectInternshala());

    render(<PopupApp />);

    expect(await screen.findByDisplayValue("Codeatrix")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Data Science")).toBeInTheDocument();
    expect(screen.getByText(/missing:/i).closest("p")).toHaveTextContent(/experience/i);
    expect(screen.getByText(/from page/i)).toHaveTextContent(/APPLY BY 18 Dec' 26/);
    expect(screen.getByText("Internshala")).toBeInTheDocument();
    expect(screen.getByLabelText(/india eligibility/i)).toHaveValue("unknown");
    expect(storedJobs()).toHaveLength(0);

    await user.clear(screen.getByLabelText(/^company/i));
    await user.type(screen.getByLabelText(/^company/i), "Codeatrix Labs");
    await user.selectOptions(screen.getByLabelText(/india eligibility/i), "remote_india");
    await user.click(screen.getByRole("button", { name: /save to job clipper/i }));

    expect(
      await screen.findByRole("heading", { name: /saved to job clipper/i }),
    ).toBeInTheDocument();
    const [job] = storedJobs();
    expect(job?.company).toBe("Codeatrix Labs");
    expect(job?.title).toBe("Data Science");
    expect(job?.deadline).toMatchObject({
      date: "2026-12-18",
      origin: "page_label",
      evidence: "APPLY BY 18 Dec' 26",
    });
    expect(job?.eligibility).toMatchObject({ value: "remote_india", overridden: true });
    expect(job?.eligibility.reasons.join(" ")).toMatch(/corrected/i);
    expect(job?.extraction?.fieldSources.company).toBe("user");
    expect(job?.extraction?.adapter).toBe("internshala");
    expect(job?.compensation.min).toBe(20_000);
    expect(job?.sourceJobId).toBe("1794985193");
  });

  it("records a user deadline when the detected date is edited", async () => {
    const user = userEvent.setup();
    chromeFake().setActiveTab({ id: 8, url: WFH_URL, title: "Data Science Internship" });
    chromeFake().runtime.sendMessage.mockImplementation(async () => detectInternshala());
    render(<PopupApp />);
    const deadline = await screen.findByLabelText(/^deadline/i);
    fireEvent.change(deadline, { target: { value: "2027-02-01" } });
    await user.click(screen.getByRole("button", { name: /save to job clipper/i }));

    expect(
      await screen.findByRole("heading", { name: /saved to job clipper/i }),
    ).toBeInTheDocument();
    expect(storedJobs()[0]?.deadline).toMatchObject({ date: "2027-02-01", origin: "user" });
  });

  it("keeps manual entry when the page cannot be read", async () => {
    const user = userEvent.setup();
    chromeFake().setActiveTab({
      id: 9,
      url: "https://example.com/careers/1",
      title: "Careers at Example",
    });
    chromeFake().runtime.sendMessage.mockImplementation(async () => ({
      ok: false,
      reason: "injection-failed",
    }));
    render(<PopupApp />);

    expect(await screen.findByText(/couldn't read this page/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toHaveValue("Careers at Example");
    expect(screen.getByText("Manual entry")).toBeInTheDocument();
    expect(storedJobs()).toHaveLength(0);

    await user.type(screen.getByLabelText(/^company/i), "Example");
    await user.click(screen.getByRole("button", { name: /save to job clipper/i }));
    expect(
      await screen.findByRole("heading", { name: /saved to job clipper/i }),
    ).toBeInTheDocument();
    expect(storedJobs()[0]?.deadline).toBeNull();
  });

  it("explains a supported page that is not a listing and stays quiet for an unsupported site", async () => {
    chromeFake().setActiveTab({
      id: 10,
      url: "https://internshala.com/internships",
      title: "Internships",
    });
    chromeFake().runtime.sendMessage.mockImplementation(async () => ({
      ok: true,
      mode: "manual",
      reason: "not-job-page",
      source: "internshala",
      adapter: "none",
      adapterVersion: 0,
      url: "https://internshala.com/internships",
      canonicalUrl: "https://internshala.com/internships",
      fieldSources: {},
    }));
    const first = render(<PopupApp />);
    expect(await screen.findByText(/doesn't look like a job listing/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^company/i)).toHaveValue("");
    first.unmount();

    chromeFake().setActiveTab({ id: 11, url: "https://example.com/jobs/1", title: "Example role" });
    chromeFake().runtime.sendMessage.mockImplementation(async () => ({
      ok: true,
      mode: "manual",
      reason: "unsupported",
      source: "other",
      adapter: "none",
      adapterVersion: 0,
      url: "https://example.com/jobs/1",
      canonicalUrl: "https://example.com/jobs/1",
      fieldSources: {},
    }));
    render(<PopupApp />);
    expect(await screen.findByDisplayValue("Example role")).toBeInTheDocument();
    expect(screen.queryByText(/doesn't look like a job listing/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^company/i)).toHaveValue("");
  });
});
