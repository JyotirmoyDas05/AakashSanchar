interface StatsBarProps {
  totalEvents: number;
  categoryLabel: string;
  timeRangeLabel: string;
}

export default function StatsBar({
  totalEvents,
  categoryLabel,
  timeRangeLabel,
}: StatsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-6 text-sm text-zinc-600">
      <span>
        <strong className="text-zinc-900">{totalEvents}</strong> events
      </span>
      <span>
        Category: <strong className="text-zinc-900">{categoryLabel}</strong>
      </span>
      <span>
        Time: <strong className="text-zinc-900">{timeRangeLabel}</strong>
      </span>
    </div>
  );
}
