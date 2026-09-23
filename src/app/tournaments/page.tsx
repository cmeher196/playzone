import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listTournaments } from "@/lib/tournaments";
import { ensureDemoData } from "@/lib/demo-data";
import { DashboardShell } from "@/components/DashboardShell";
import { isAdmin } from "@/lib/admin";
import { appConfig } from "@/lib/config";
import { formatMatchDate } from "@/lib/format";

export default async function TournamentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  await ensureDemoData();

  const tournaments = await listTournaments();
  const { currencySymbol } = appConfig;

  return (
    <DashboardShell userName={user.name} isAdmin={isAdmin(user)}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Tournaments</h1>
        <Link
          href="/tournaments/new"
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300"
        >
          + Create
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <div className="mb-3 text-4xl">🏆</div>
          <p className="text-white/70">No tournaments yet.</p>
          <p className="mt-1 text-sm text-white/40">
            Be the first to create one and invite players to join.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-emerald-400/40 hover:bg-white/[0.05]"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-white group-hover:text-emerald-200">
                  {t.name}
                </h2>
                <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70">
                  {t.entryFee > 0 ? `${currencySymbol}${t.entryFee}` : "Free"}
                </span>
              </div>
              {t.venue && (
                <p className="mt-1 text-sm text-white/50">📍 {t.venue}</p>
              )}
              <p className="mt-2 text-sm text-white/60">
                🗓️ {formatMatchDate(t.matchDates[0])}
                {t.matchDates.length > 1 && (
                  <span className="text-white/40">
                    {" "}
                    +{t.matchDates.length - 1} more
                  </span>
                )}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-white/40">
                <span>by {t.organizerName}</span>
                <span>{t.participants.length} joined</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
