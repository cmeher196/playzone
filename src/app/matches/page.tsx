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
  canStart,
}: {
  m: LiveMatch;
  tournamentName?: string;
  canStart: boolean;
}) {
  const computed = computeMatch(m);
  const innings = computed.innings.filter(Boolean) as InningsState[];
  const badge =
    m.status === "live"
      ? "LIVE"
      : m.status === "completed"
        ? "Past"
        : "Upcoming";
  const badgeClass =
    m.status === "live"
      ? "bg-rose-500/15 text-rose-300"
      : m.status === "completed"
        ? "bg-white/10 text-white/60"
        : "bg-sky-400/10 text-sky-300";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-emerald-400/40">
      <Link href={`/matches/${m.id}`} className="block p-4">
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
      {canStart && m.status === "scheduled" && (
        <div className="border-t border-white/10 px-4 py-3">
          <Link
            href={`/matches/${m.id}`}
            className="block rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2.5 text-center text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300"
          >
            Start match
          </Link>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  matches,
  names,
  currentUserId,
}: {
  title: string;
  matches: LiveMatch[];
  names: Map<string, string>;
  currentUserId: string;
}) {
  if (matches.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="mb-3 text-lg font-semibold text-white">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {matches.map((m) => (
          <MatchCard
            key={m.id}
            m={m}
            tournamentName={m.tournamentId ? names.get(m.tournamentId) : "Standalone match"}
            canStart={m.ownerId === currentUserId}
          />
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
  const visibleMatches = all;

  const live = visibleMatches.filter((m) => m.status === "live");
  const upcoming = visibleMatches.filter((m) => m.status === "scheduled");
  const completed = visibleMatches.filter((m) => m.status === "completed");

  return (
    <DashboardShell userName={user.name} isAdmin={admin}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/40">
            {visibleMatches.length} match{visibleMatches.length === 1 ? "" : "es"}
          </span>
          {user.role !== "guest" && (
            <Link
              href="/matches/new"
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-3 py-2 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300"
            >
              + New match
            </Link>
          )}
        </div>
      </div>
      <p className="mb-4 text-sm text-white/50">
        {admin
          ? "Live, upcoming and completed matches across all tournaments. Open any match for Live, Scorecard, Squads, Overs and Commentary."
          : "Live, upcoming and past matches. Open any match to view the scoreboard and commentary."}
      </p>

      {visibleMatches.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/50">
          No matches have been created yet.
        </p>
      ) : (
        <>
          <Section title="Live now" matches={live} names={names} currentUserId={user.id} />
          <Section title="Upcoming" matches={upcoming} names={names} currentUserId={user.id} />
          <Section title="Completed" matches={completed} names={names} currentUserId={user.id} />
        </>
      )}
    </DashboardShell>
  );
}
