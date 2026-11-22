import { HardDrive, Info, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "../PageHeader";

function SettingsSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="panel-surface flex gap-4 p-6">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full border border-border-strong bg-surface-2 text-accent"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-text">{title}</h2>
        <div className="mt-1.5 text-sm text-text-muted">{children}</div>
      </div>
    </section>
  );
}

export function SettingsPage({ jobCount }: { jobCount: number }) {
  const version = chrome.runtime.getManifest().version;

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <PageHeader eyebrow="Preferences" title={<>Settings</>}>
        Reminder preferences arrive in Phase 5, and export and backup in Phase 6.
      </PageHeader>

      <div className="flex flex-col gap-4">
        <SettingsSection icon={<HardDrive size={16} />} title="Your data">
          <p>
            {jobCount} {jobCount === 1 ? "application is" : "applications are"} stored in this
            browser's extension storage.
          </p>
        </SettingsSection>
        <SettingsSection icon={<ShieldCheck size={16} />} title="Privacy">
          <p>
            Job Clipper has no account, server or analytics. Nothing you save leaves this device.
            Uninstalling the extension deletes its data.
          </p>
        </SettingsSection>
        <SettingsSection icon={<Info size={16} />} title="About">
          <p>
            Job Clipper <span className="font-mono text-text">v{version}</span>, built for the BSERC
            GenAI Internship (Week 2, Project 10).
          </p>
        </SettingsSection>
      </div>
    </div>
  );
}
