import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { chromeFake } from "../../../tests/fakes/chrome";
import { ReminderSettings } from "./ReminderSettings";

describe("ReminderSettings", () => {
  it("sends a test notification through the extension", async () => {
    const user = userEvent.setup();
    render(<ReminderSettings />);

    await user.click(screen.getByRole("button", { name: "Send test notification" }));

    expect(chromeFake().runtime.sendMessage).toHaveBeenCalledWith({ type: "jc:test-notification" });
    expect(await screen.findByText(/couldn't send a test notification/i)).toBeInTheDocument();
  });

  it("saves the default lead time", async () => {
    const user = userEvent.setup();
    render(<ReminderSettings />);

    const save = await screen.findByRole("button", { name: "Save reminder settings" });
    await waitFor(() => expect(save).toBeEnabled());
    await user.selectOptions(screen.getByLabelText("Default lead time"), "3");
    await user.click(save);

    expect(await screen.findByText(/reminder settings saved/i)).toBeInTheDocument();
    const stored = await chromeFake().storage.local.get("settings");
    expect(stored.settings).toMatchObject({ reminders: { leadDays: 3, atTime: "09:00" } });
  });
});
