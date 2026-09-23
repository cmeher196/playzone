import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getTournament, canManageTournament } from "@/lib/tournaments";
import { listTeamsForTournament } from "@/lib/teams";
import { listPlayers } from "@/lib/registrations";
import { listLiveMatchesForTournament } from "@/lib/live-matches";
import { computeStandings, generateFixtures } from "@/lib/standings";
import { ensureDemoData } from "@/lib/demo-data";
import { DashboardShell } from "@/components/DashboardShell";
import { isAdmin } from "@/lib/admin";
import { JoinTournament } from "@/components/JoinTournament";
import { MatchList } from "@/components/MatchList";
import { ManageTournament } from "@/components/ManageTournament";
import { TournamentStandings } from "@/components/TournamentStandings";
import { AddParticipants } from "@/components/AddParticipants";
import { ShareTournamentButton } from "@/components/ShareTournamentButton";
import { TournamentParticipants } from "@/components/TournamentParticipants";
import { appConfig } from "@/lib/config";
import { formatMatchDate } from "@/lib/format";

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  await ensureDemoData();

  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const { currencySymbol } = appConfig;
  const admin = isAdmin(user);
  const joined = tournament.participants.some((p) => p.playerId === user.id);
  const isOrganizer = tournament.organizerId === user.id;
  const canManage = canManageTournament(tournament, {
    id: user.id,
    isAdmin: admin,
  });
  const matches = tournament.matches ?? [];
  const teams = await listTeamsForTournament(id);
  const allLiveMatches = await listLiveMatchesForTournament(id);
  const liveMatches = allLiveMatches.filter((m) => m.status !== "completed");
  const standings =
    teams.length >= 2 ? computeStandings(teams, allLiveMatches) : [];
  const fixtures =
    teams.length >= 2 ? generateFixtures(teams, allLiveMatches) : [];
  const availablePlayers = canManage
    ? (await listPlayers())
        .filter(
          (p) =>
            p.role !== "admin" &&
            !tournament.participants.some((pp) => pp.playerId === p.id),
        )
        .map((p) => ({
          id: p.id,
          name: p.name,
          mobile: p.mobile,
          playerType: p.playerType,
        }))
    : [];
  const accessLabel = isOrganizer
    ? "👑 Owner"
    : admin
      ? "🛡️ Admin"
      : joined
        ? "✓ Participant · view only"
        : "View only";

  return (
    <DashboardShell userName={user.name} isAdmin={isAdmin(user)}>
      <Link
        href="/tournaments"
        className="text-sm text-white/50 transition hover:text-white/80"
      >
        ← Back to tournaments
      </Link>

      <div className="mt-2 mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tournament.name}</h1>
          <p className="mt-1 text-sm text-white/50">
            Organised by {tournament.organizerName}
            {isOrganizer && " (you)"}
          </p>
          <span className="mt-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70">
            {accessLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canManage && <ShareTournamentButton href={`/join/cricket/${tournament.id}`} />}
          <span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-sm font-semibold text-emerald-200">
            {tournament.entryFee > 0
              ? `${currencySymbol}${tournament.entryFee} entry`
              : "Free entry"}
          </span>
        </div>
      </div>

      {canManage && (
        <div className="mb-6 rounded-3xl border border-amber-300/20 bg-amber-400/[0.04] p-5">
          <h2 className="mb-3 text-sm font-semibold text-amber-200">
            Manage tournament
          </h2>
          <ManageTournament
            tournamentId={tournament.id}
            initial={{
              name: tournament.name,
              venue: tournament.venue,
              description: tournament.description,
              entryFee: tournament.entryFee,
              matchDates: tournament.matchDates,
            }}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          {tournament.venue && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-white/40">
                Venue
              </div>
              <div className="text-white">📍 {tournament.venue}</div>
            </div>
          )}
          <div>
            <div className="text-[11px] uppercase tracking-wide text-white/40">
              Match dates
            </div>
            <ul className="mt-1 space-y-1">
              {tournament.matchDates.map((d, i) => (
                <li key={i} className="text-white">
                  🗓️ {formatMatchDate(d)}
                </li>
              ))}
            </ul>
          </div>
          {tournament.description && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-white/40">
                Details
              </div>
              <p className="whitespace-pre-line text-sm text-white/70">
                {tournament.description}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              Players ({tournament.participants.length})
            </h2>
          </div>
          <TournamentParticipants tournamentId={tournament.id} participants={tournament.participants} canManage={canManage} />
        </div>
      </div>

      {canManage && (
        <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5">
          <h2 className="mb-3 text-sm font-semibold text-emerald-200">
            Add players to this tournament
          </h2>
          <AddParticipants
            tournamentId={tournament.id}
            available={availablePlayers}
          />
        </div>
      )}

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            Teams ({teams.length})
          </h2>
          <Link
            href={`/tournaments/${tournament.id}/teams/new`}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300"
          >
            + Create team
          </Link>
        </div>
        {teams.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/50">
            No teams yet. Create teams and assign players to them.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {teams.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/teams/${t.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-emerald-400/40"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-xl">
                    {t.logo?.startsWith("/uploads/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.logo}
                        alt={`${t.name} logo`}
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      t.logo || "🏏"
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white">{t.name}</div>
                    <div className="text-xs text-white/50">
                      {t.players.length} players
                    </div>
                  </div>
                  <span className="text-white/30">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {teams.length >= 2 && (
        <TournamentStandings
          standings={standings}
          fixtures={fixtures}
          tournamentId={tournament.id}
          canManage={canManage}
        />
      )}

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            Live &amp; upcoming matches
          </h2>
          {canManage && teams.length >= 2 && (
            <Link
              href={`/tournaments/${tournament.id}/matches/new`}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300"
            >
              + New match
            </Link>
          )}
        </div>
        {liveMatches.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/50">
            {canManage
              ? teams.length < 2
                ? "Create at least two teams to start a match."
                : "No live matches. Create one to start ball-by-ball scoring."
              : "No live matches right now."}
          </p>
        ) : (
          <ul className="space-y-2">
            {liveMatches.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/matches/${m.id}`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-emerald-400/40"
                >
                  <div className="font-medium text-white">
                    {m.teamA.name} <span className="text-white/40">vs</span>{" "}
                    {m.teamB.name}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.status === "live" ? "bg-rose-500/15 text-rose-300" : "bg-white/10 text-white/60"}`}
                  >
                    {m.status === "live" ? "🔴 LIVE" : "Scheduled"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-white">
          Matches &amp; scorecards
        </h2>
        <MatchList matches={matches} currentPlayerId={user.id} />
      </div>

      <div className="mt-6">
        {joined ? (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-5 py-4 text-emerald-200">
            <span aria-hidden>✓</span>
            <span className="font-medium">You&apos;ve joined this tournament.</span>
          </div>
        ) : (
          <>
            <h2 className="mb-3 text-lg font-semibold text-white">Join this tournament</h2>
            <JoinTournament
              tournamentId={tournament.id}
              tournamentName={tournament.name}
              entryFee={tournament.entryFee}
            />
          </>
        )}
      </div>
    </DashboardShell>
  );
}
