import type { BadmintonTeamStandingRow } from "@/lib/badminton-tournaments";

export function BadmintonGroupStandings({
  groups,
  teamNames,
  advanceCount,
}: {
  groups: { id: string; name: string; rows: BadmintonTeamStandingRow[] }[];
  teamNames: Record<string, string>;
  advanceCount: number;
}) {
  const nameOf = (id: string) => teamNames[id] ?? id;

  if (groups.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Group Standings</h2>
        <span className="text-xs text-white/50">
          Top {advanceCount} advance{advanceCount === 1 ? "s" : ""} per group
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map((group) => (
          <div key={group.id} className="rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <h3 className="font-semibold text-orange-200">{group.name}</h3>
              <span className="text-xs text-white/40">{group.rows.length} teams</span>
            </div>
            {group.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-white/50">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Team</th>
                      <th className="px-3 py-2 text-center">P</th>
                      <th className="px-3 py-2 text-center">W</th>
                      <th className="px-3 py-2 text-center">L</th>
                      <th className="px-3 py-2 text-center">Games</th>
                      <th className="px-3 py-2 text-center">Pts +/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((r, i) => {
                      const qualifies = i < advanceCount;
                      return (
                        <tr
                          key={r.teamId}
                          className={`border-t border-white/10 ${
                            qualifies ? "bg-emerald-400/[0.06]" : ""
                          }`}
                        >
                          <td className="px-3 py-2 text-white/40">
                            {qualifies ? <span className="text-emerald-300">{i + 1}</span> : i + 1}
                          </td>
                          <td className="px-3 py-2 font-medium">{nameOf(r.teamId)}</td>
                          <td className="px-3 py-2 text-center">{r.played}</td>
                          <td className="px-3 py-2 text-center text-emerald-300">{r.won}</td>
                          <td className="px-3 py-2 text-center text-rose-300">{r.lost}</td>
                          <td className="px-3 py-2 text-center text-white/70">
                            {r.gamesWon}–{r.gamesLost}
                          </td>
                          <td className="px-3 py-2 text-center text-white/70">
                            {r.pointsFor - r.pointsAgainst >= 0 ? "+" : ""}
                            {r.pointsFor - r.pointsAgainst}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-4 py-3 text-sm text-white/50">No teams assigned yet.</p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-white/40">
        <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400/60 align-middle" />
        Qualifies for the knockout stage
      </p>
    </section>
  );
}
