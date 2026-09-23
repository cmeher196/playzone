import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { listAllLiveMatches } from "@/lib/live-matches";
import { listTournaments } from "@/lib/tournaments";
import { computeMatch, type LiveMatch, type InningsState } from "@/lib/live-scoring";
import { DashboardShell } from "@/components/DashboardShell";

function MatchCard({
  m,
  tournamentName,
}: {
  m: LiveMatch;
  tournamentName?: string;
}) {
  const computed = computeMatch(m);
  const innings = computed.innings.filter(Boolean) as InningsState[];
  const badge =
    m.status === "live"
      ? "🔴 LIVE"
      : m.status === "completed"
        ? "Completed"
        : "Scheduled";
  const badgeClass =
    m.status === "live"
      ? "bg-rose-500/15 text-rose-300"
      : m.status === "completed"
        ? "bg-white/10 text-white/60"
        : "bg-sky-400/10 text-sky-300";
  return (
    <Link
      href={`/matches/${m.id}`}
      className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-emerald-400/40"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="truncate text-sm text-white/50">
          {tournamentName ?? "Tournament"}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}
        >
          {badge}
        </span>
      </div>
      <div className="mt-1 font-semibold text-white">
        {m.teamA.name} <span className="text-white/40">vs</span> {m.teamB.name}
      </div>
      {innings.length > 0 && (
        <div className="mt-1 space-y-0.5 text-sm text-white/70">
          {innings.map((s, i) => (
            <div key={i}>
              {s.battingTeam.name}{" "}
              <span className="font-medium text-white">
                {s.runs}/{s.wickets}
              </span>{" "}
              <span className="text-white/40">({s.oversText})</span>
            </div>
          ))}
        </div>
      )}
      {computed.result && (
        <div className="mt-1 text-sm font-medium text-emerald-300">
          {computed.result}
        </div>
      )}
    </Link>
  );
}

function Section({
  title,
  matches,
  names,
}: {
  title: string;
  matches: LiveMatch[];
  names: Map<string, string>;
}) {
  if (matches.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="mb-3 text-lg font-semibold text-white">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {matches.map((m) => (
          <MatchCard key={m.id} m={m} tournamentName={names.get(m.tournamentId)} />
        ))}
      </div>
    </div>
  );
}

export default async function MyMatchesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const admin = isAdmin(user);

  const all = await listAllLiveMatches();
  const tournaments = await listTournaments();
  const names = new Map(tournaments.map((t) => [t.id, t.name]));
  const organizerOf = new Set(
    tournaments.filter((t) => t.organizerId === user.id).map((t) => t.id),
  );

  const mine = all.filter((m) => {
    if (admin) return true;
    const inTeam = [...m.teamA.players, ...m.teamB.players].some(
      (p) => p.playerId === user.id,
    );
    return inTeam || organizerOf.has(m.tournamentId);
  });

  const live = mine.filter((m) => m.status === "live");
  const upcoming = mine.filter((m) => m.status === "scheduled");
  const completed = mine.filter((m) => m.status === "completed");

  return (
    <DashboardShell userName={user.name} isAdmin={admin}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">My Matches</h1>
        <span className="text-sm text-white/40">
          {mine.length} match{mine.length === 1 ? "" : "es"}
        </span>
      </div>
      <p className="mb-4 text-sm text-white/50">
        {admin
          ? "All live-scored matches. Open any match for Live, Scorecard, Squads, Overs and Commentary."
          : "Matches you play in or organise. Open any match for Live, Scorecard, Squads, Overs and Commentary."}
      </p>

      {mine.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/50">
          No matches yet. Join a team in a tournament to see your matches here.
        </p>
      ) : (
        <>
          <Section title="Live now" matches={live} names={names} />
          <Section title="Upcoming" matches={upcoming} names={names} />
          <Section title="Completed" matches={completed} names={names} />
        </>
      )}
    </DashboardShell>
  );
}
