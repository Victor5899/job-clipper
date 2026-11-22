import { format } from "date-fns";
import { deadlineEnd } from "./computeRemindAt";
import type { JobApplication } from "../model/types";

/** What the job sheet says about the reminder. Deadlines are never invented here. */
export function describeReminder(job: JobApplication, now: Date): string {
  const end = deadlineEnd(job.deadline);
  if (!end) return "Add a deadline to enable reminders";
  if (end.getTime() <= now.getTime()) return "No reminder. The deadline has passed.";
  if (job.reminder.soonAt) {
    const at = new Date(job.reminder.soonAt);
    const pending =
      !Number.isNaN(at.getTime()) && at.getTime() > now.getTime() && at.getTime() < end.getTime();
    if (pending) {
      return `Reminder set for ${format(at, "d MMM yyyy, HH:mm")}`;
    }
  }
  if (!job.reminder.enabled) return "Off";
  if (job.reminder.status === "scheduled" && job.reminder.remindAt) {
    const at = new Date(job.reminder.remindAt);
    if (!Number.isNaN(at.getTime())) return `Scheduled for ${format(at, "d MMM yyyy, HH:mm")}`;
  }
  if (job.reminder.status === "fired") return "Reminder sent";
  if (job.reminder.status === "missed") return "Missed reminder sent";
  if (job.reminder.status === "expired") return "Expired";
  return "On";
}
