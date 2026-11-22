import { Download, Menu, Plus, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { BrandLockup } from "../../ui/components/BrandMark";
import { Button } from "../../ui/components/Button";
import { downloadAllJobsCsv } from "../exportCsv";
import { ROUTE_LABELS, ROUTES, routeHref, type RouteName } from "../router";

interface TopNavProps {
  current: RouteName;
  onAddApplication: () => void;
  onNotice: (message: string) => void;
}

function NavLink({
  route,
  current,
  onNavigate,
}: {
  route: RouteName;
  current: RouteName;
  onNavigate?: () => void;
}) {
  const active = route === current;
  return (
    <a
      href={routeHref(route)}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={[
        "group inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[12.5px] tracking-tight transition-colors",
        active ? "text-text" : "text-text-muted hover:text-text",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full transition-colors ${active ? "bg-accent" : "bg-transparent"}`}
      />
      {ROUTE_LABELS[route]}
    </a>
  );
}

export function TopNav({ current, onAddApplication, onNotice }: TopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuId = useId();

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      onNotice(await downloadAllJobsCsv());
    } catch {
      onNotice("Couldn't export a CSV.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <a href={routeHref("overview")} className="rounded-md" aria-label="Job Clipper, Overview">
          <BrandLockup />
        </a>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {ROUTES.map((route) => (
              <li key={route}>
                <NavLink route={route} current={current} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={exporting}
            onClick={() => void exportCsv()}
            className="hidden sm:inline-flex"
          >
            <Download size={15} aria-hidden="true" />
            Export CSV
          </Button>
          <Button
            variant="light"
            size="sm"
            onClick={onAddApplication}
            className="hidden sm:inline-flex"
          >
            <Plus size={15} aria-hidden="true" />
            Add application
          </Button>
          <button
            type="button"
            className="grid size-9 cursor-pointer place-items-center rounded-full border border-border-strong text-text md:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id={menuId} aria-label="Main" className="border-t border-border px-5 pb-4 md:hidden">
          <ul className="flex flex-col gap-1 pt-3">
            {ROUTES.map((route) => (
              <li key={route}>
                <NavLink route={route} current={current} onNavigate={() => setMenuOpen(false)} />
              </li>
            ))}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full"
            disabled={exporting}
            onClick={() => {
              setMenuOpen(false);
              void exportCsv();
            }}
          >
            <Download size={15} aria-hidden="true" />
            Export CSV
          </Button>
          <Button
            variant="light"
            size="sm"
            className="mt-3 w-full sm:hidden"
            onClick={() => {
              setMenuOpen(false);
              onAddApplication();
            }}
          >
            <Plus size={15} aria-hidden="true" />
            Add application
          </Button>
        </nav>
      )}
    </header>
  );
}
