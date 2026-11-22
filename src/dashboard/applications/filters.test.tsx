import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chromeFake } from "../../../tests/fakes/chrome";
import { makeJob } from "../../../tests/factories";
import { jobKey } from "../../storage/chromeStorage";
import { App } from "../App";

beforeEach(() => {
  URL.createObjectURL = vi.fn((blob: Blob) => {
    (URL.createObjectURL as unknown as { last?: Blob }).last = blob;
    return "blob:test";
  });
  URL.revokeObjectURL = vi.fn();
});

async function lastDownload(): Promise<{ name: string; csv: string }> {
  const blob = (URL.createObjectURL as unknown as { last?: Blob }).last;
  expect(blob).toBeInstanceOf(Blob);
  const bytes = new Uint8Array(await blob!.arrayBuffer());
  expect(bytes.slice(0, 3)).toEqual(new Uint8Array([0xef, 0xbb, 0xbf]));
  return {
    name: (URL.createObjectURL as unknown as { name?: string }).name ?? "",
    csv: new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes),
  };
}

async function go(user: ReturnType<typeof userEvent.setup>) {
  const nav = screen.getAllByRole("navigation", { name: "Main" })[0]!;
  await user.click(within(nav).getByRole("link", { name: "Applications" }));
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

describe("application search and filtered export", () => {
  it("keeps the filter in the hash, shows the count, and exports that set", async () => {
    let filename = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function click(
      this: HTMLAnchorElement,
    ) {
      filename = this.download;
    });
    const user = userEvent.setup();
    const interview = makeJob({
      id: "shown",
      title: "Data Analyst Intern",
      company: "Zomato",
      status: "interview",
      description: "Should stay out of the CSV",
      savedAt: new Date().toISOString(),
    });
    const saved = makeJob({
      id: "hidden",
      title: "Backend Intern",
      company: "Groww",
      status: "saved",
      savedAt: new Date().toISOString(),
    });
    await chromeFake().storage.local.set({
      [jobKey(interview.id)]: interview,
      [jobKey(saved.id)]: saved,
    });
    const first = render(<App />);
    await go(user);
    expect(await screen.findByRole("button", { name: "Data Analyst Intern" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Backend Intern" })).toBeInTheDocument();

    const filters = screen.getByRole("region", { name: "Application filters" });
    await user.click(within(filters).getByRole("button", { name: "Status" }));
    await user.click(within(filters).getByRole("checkbox", { name: "Interview" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Backend Intern" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Data Analyst Intern" })).toBeInTheDocument();
    expect(within(filters).getByRole("status")).toHaveTextContent("1 of 2 applications");
    expect(window.location.hash).toContain("status=interview");

    await user.click(within(filters).getByRole("button", { name: "Export filtered" }));
    const file = await lastDownload();
    expect(filename).toMatch(/^job-clipper-filtered-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(file.csv).toContain("Data Analyst Intern");
    expect(file.csv).not.toContain("Backend Intern");
    expect(file.csv).not.toContain("Should stay out of the CSV");
    expect(file.csv).not.toContain("\nDescription,");

    first.unmount();
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Data Analyst Intern" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Backend Intern" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backend Intern" })).toBeInTheDocument();
    });
    expect(window.location.hash).not.toContain("status=");
  });

  it("searches from the box and focuses it with the slash shortcut", async () => {
    const user = userEvent.setup();
    await chromeFake().storage.local.set({
      [jobKey("a")]: makeJob({
        id: "a",
        title: "Warehouse Analyst",
        company: "Acme",
        notes: "Tamil தரவு",
        savedAt: new Date().toISOString(),
      }),
      [jobKey("b")]: makeJob({
        id: "b",
        title: "Support Intern",
        company: "Beta",
        savedAt: new Date().toISOString(),
      }),
    });
    render(<App />);
    await go(user);
    await screen.findByRole("button", { name: "Warehouse Analyst" });

    await user.keyboard("/");
    const search = screen.getByRole("searchbox", { name: "Search applications" });
    expect(search).toHaveFocus();
    await user.type(search, "தரவு");
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Support Intern" })).not.toBeInTheDocument();
    });
    expect(window.location.hash).toContain("q=");
    expect(screen.getByRole("button", { name: "Warehouse Analyst" })).toBeInTheDocument();
  });
});
