import type { ReactNode } from "react";

interface DashboardShellProps {
  title: string;
  subtitle: string;
  filterBar: ReactNode;
  statsBar: ReactNode;
  map: ReactNode;
  detailsPanel?: ReactNode;
}

export default function DashboardShell({
  title,
  subtitle,
  filterBar,
  statsBar,
  map,
  detailsPanel,
}: DashboardShellProps) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="px-6 pt-6 pb-1 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
      </header>
      <div className="px-6 py-2">{filterBar}</div>
      <div className="px-6 pb-2">{statsBar}</div>
      <main className="flex flex-1 px-6 pb-6">
        <div className="flex flex-1 gap-4">
          <div className="flex-1 overflow-hidden rounded-lg border">{map}</div>
          {detailsPanel && (
            <div className="w-80 shrink-0 overflow-hidden rounded-lg border">
              {detailsPanel}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
