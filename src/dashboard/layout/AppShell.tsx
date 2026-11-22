import type { ReactNode } from "react";
import type { RouteName } from "../router";
import { TopNav } from "./TopNav";

interface AppShellProps {
  route: RouteName;
  onAddApplication: () => void;
  onNotice: (message: string) => void;
  children: ReactNode;
}

export function AppShell({ route, onAddApplication, onNotice, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main")?.focus();
        }}
        className="sr-only z-50 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <TopNav current={route} onAddApplication={onAddApplication} onNotice={onNotice} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <footer className="border-t border-border">
        <p className="micro-label mx-auto max-w-7xl px-5 py-6 text-text-subtle sm:px-8">
          Job Clipper · Your data stays on this device
        </p>
      </footer>
    </div>
  );
}
