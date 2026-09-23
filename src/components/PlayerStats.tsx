import type { PlayerStats } from "@/lib/stats";
import { ratingTier } from "@/lib/rating";

export function PlayerRatingCard({
  points,
  ppm,
  matches,
}: {
  points: number;
  ppm: number;
  matches: number;
}) {
  const tier = ratingTier(ppm);
  return (
    <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 to-transparent p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/40">
            SMPL Rating
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-3xl font-bold text-emerald-300">{ppm}</span>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-200">
              {tier.label}
            </span>
          </div>
          <div className="mt-1 text-sm tracking-wide" aria-label={`${tier.stars} out of 5`}>
            <span className="text-amber-300">{"★".repeat(tier.stars)}</span>
            <span className="text-white/15">{"★".repeat(5 - tier.stars)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-white/40">
            Points
          </div>
          <div className="text-2xl font-bold text-white">{points}</div>
          <div className="text-xs text-white/40">{matches} matches</div>
        </div>
      </div>
    </div>
  );
}

export function StatOverview({
  items,
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {items.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
        >
          <div className="text-2xl font-bold text-emerald-300">{s.value}</div>
          <div className="mt-1 text-xs text-white/50">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function StatBlock({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string | number }[];
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
      <dl className="space-y-1.5">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between text-sm"
          >
            <dt className="text-white/50">{r.label}</dt>
            <dd className="font-medium text-white">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function PerformancePanels({ stats }: { stats: PlayerStats }) {
  const batting = [
    { label: "Innings", value: stats.battingInnings },
    { label: "Runs", value: stats.runs },
    { label: "Average", value: stats.battingAverage ?? "—" },
    { label: "Strike rate", value: stats.strikeRate ?? "—" },
    { label: "High score", value: stats.highScore },
    { label: "Not outs", value: stats.notOuts },
    { label: "Fours", value: stats.fours },
    { label: "Sixes", value: stats.sixes },
  ];
  const bowling = [
    { label: "Innings", value: stats.bowlingInnings },
    { label: "Wickets", value: stats.wickets },
    { label: "Best", value: stats.bestBowling },
    { label: "Economy", value: stats.economy ?? "—" },
    { label: "Maidens", value: stats.maidens },
    { label: "Runs conceded", value: stats.runsConceded },
  ];
  const fielding = [
    { label: "Catches", value: stats.catches },
    { label: "Stumpings", value: stats.stumpings },
    { label: "Run outs", value: stats.runOuts },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatBlock title="🏏 Batting" rows={batting} />
      <StatBlock title="🎯 Bowling" rows={bowling} />
      <StatBlock title="🧤 Fielding" rows={fielding} />
    </div>
  );
}
