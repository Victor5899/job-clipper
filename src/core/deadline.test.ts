import { describe, expect, it } from "vitest";
import { formatCardDeadline } from "./deadline";

const now = new Date("2026-11-22T15:00:00");

describe("formatCardDeadline", () => {
  it("says when no deadline was provided", () => {
    expect(formatCardDeadline(null, now)).toEqual({
      text: "No deadline provided",
      tone: "none",
    });
  });

  it("shows a due date with the days left, and marks a passed deadline closed", () => {
    expect(formatCardDeadline({ date: "2026-11-25", origin: "user" }, now)).toEqual({
      text: "Due 25 Nov · 3d",
      tone: "soon",
    });
    expect(formatCardDeadline({ date: "2026-12-20", origin: "user" }, now).tone).toBe("ok");
    expect(formatCardDeadline({ date: "2026-11-19", origin: "user" }, now)).toEqual({
      text: "Closed 3d ago",
      tone: "overdue",
    });
  });
});
