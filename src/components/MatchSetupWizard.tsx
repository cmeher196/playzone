"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Team } from "@/lib/teams";

type Slot = "A" | "B";
type Step = "teams" | "players" | "details";
type EligiblePlayer = { id: string; name: string; mobile: string };

const inputClass = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";
const buttonClass = "rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "mb-1.5 block text-sm font-medium text-emerald-100/80";

/**
 * Match creation only picks the two teams (using their full current
 * roster) and the match logistics. Playing squad (minimum 2 players), 12th man,
 * captain, vice-captain, and wicketkeeper are decided later, right before the match
 * starts (see the lineup step in Scorer.tsx) — many matches are scheduled
 * well ahead of when that's actually known.
 */
export function MatchSetupWizard({
  tournamentId,
  initialTeams,
  eligiblePlayers = [],
}: {
  tournamentId?: string;
  initialTeams: Team[];
  eligiblePlayers?: EligiblePlayer[];
}) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);
  const [availablePlayers, setAvailablePlayers] = useState(eligiblePlayers);
  const [teamA, setTeamA] = useState<Team | null>(null);
  const [teamB, setTeamB] = useState<Team | null>(null);
  const [step, setStep] = useState<Step>("teams");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [overs, setOvers] = useState("6");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [venue, setVenue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerQuery, setPlayerQuery] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [playerNumber, setPlayerNumber] = useState("1");
  const [showNewPlayer, setShowNewPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerMobile, setNewPlayerMobile] = useState("");
  const [playerSlot, setPlayerSlot] = useState<Slot>("A");

  const otherTeam = slot === "A" ? teamB : teamA;
  const squadsReady = Boolean(teamA && teamB && teamA.players.length >= 2 && teamB.players.length >= 2);

  function openTeamPicker(nextSlot: Slot) {
    setSlot(nextSlot);
    setStep("teams");
    setTeamSearch("");
    setError(null);
  }

  function chooseTeam(team: Team) {
    if (!slot) return;
    setPlayerSlot(slot);
    if (slot === "A") setTeamA(team);
    else setTeamB(team);
    setTeamSearch("");
    setSlot(null);
    setPlayerQuery("");
    setSelectedPlayerId("");
    setShowNewPlayer(false);
    setError(null);
    setStep("players");
  }

  async function createTeam() {
    if (!slot || newTeamName.trim().length < 2) {
      setError("Enter a team name first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(tournamentId ? `/api/tournaments/${tournamentId}/teams` : "/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      const data = (await response.json()) as { error?: string; team?: Team };
      if (!response.ok || !data.team) {
        setError(data.error ?? "Could not add the team.");
        return;
      }
      setTeams((value) => [...value, data.team!]);
      setNewTeamName("");
      setShowNewTeam(false);
      chooseTeam(data.team);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!teamA || !teamB || !squadsReady) {
      setError("Both teams need at least two players — add players from the team's page first.");
      return;
    }
    const oversNumber = Number(overs);
    if (!Number.isInteger(oversNumber) || oversNumber < 1 || oversNumber > 50) {
      setError("Enter between 1 and 50 overs.");
      return;
    }
    setBusy(true);
    try {
      // Standalone matches use the same real team/player ids as tournament
      // matches (just without a tournamentId) so completed standalone
      // matches still attribute performance to the real player accounts.
      // The full roster is sent — the playing squad is chosen later, at match start.
      const response = await fetch(tournamentId ? `/api/tournaments/${tournamentId}/matches` : "/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamAId: teamA.id,
          teamBId: teamB.id,
          teamAPlayerIds: teamA.players.map((player) => player.playerId),
          teamBPlayerIds: teamB.players.map((player) => player.playerId),
          overs: oversNumber,
          date,
          venue: venue.trim() || undefined,
        }),
      });
      const data = (await response.json()) as { error?: string; match?: { id: string } };
      if (!response.ok || !data.match) {
        setError(data.error ?? "Could not create the match.");
        return;
      }
      router.push(`/matches/${data.match.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function addExistingPlayer() {
    const team = playerSlot === "A" ? teamA : teamB;
    if (!team || !selectedPlayerId || !/^\d{1,3}$/.test(playerNumber)) {
      setError("Select a player and enter a valid jersey number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/${team.id}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: selectedPlayerId, playerNumber }),
      });
      const data = (await response.json()) as { team?: Team; error?: string };
      if (!response.ok || !data.team) {
        setError(data.error ?? "Could not add the player.");
        return;
      }
      updateTeamAfterPlayerChange(data.team);
      setSelectedPlayerId("");
      setPlayerNumber("1");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function addNewPlayer() {
    const team = playerSlot === "A" ? teamA : teamB;
    if (!team || newPlayerName.trim().length < 2 || !/^[6-9]\d{9}$/.test(newPlayerMobile) || !/^\d{1,3}$/.test(playerNumber)) {
      setError("Enter a player name, valid 10-digit mobile number, and jersey number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/${team.id}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPlayer: { name: newPlayerName.trim(), mobile: newPlayerMobile },
          playerNumber,
        }),
      });
      const data = (await response.json()) as { team?: Team; error?: string };
      if (!response.ok || !data.team) {
        setError(data.error ?? "Could not create the player.");
        return;
      }
      updateTeamAfterPlayerChange(data.team);
      setAvailablePlayers((value) => [...value, {
        id: data.team!.players[data.team!.players.length - 1].playerId,
        name: newPlayerName.trim(),
        mobile: newPlayerMobile,
      }]);
      setNewPlayerName("");
      setNewPlayerMobile("");
      setPlayerNumber("1");
      setShowNewPlayer(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function updateTeamAfterPlayerChange(updatedTeam: Team) {
    setTeams((value) => value.map((team) => team.id === updatedTeam.id ? updatedTeam : team));
    if (playerSlot === "A") setTeamA(updatedTeam);
    else setTeamB(updatedTeam);
  }

  function continueAfterPlayers() {
    const team = playerSlot === "A" ? teamA : teamB;
    if (!team || team.players.length < 2) {
      setError("Add at least 2 players to this team before continuing.");
      return;
    }
    setError(null);
    if (playerSlot === "A") {
      setSlot("B");
      setStep("teams");
    } else {
      setStep("details");
    }
  }

  if (step === "teams") return <TeamStep teamA={teamA} teamB={teamB} slot={slot} otherTeam={otherTeam} teams={teams} teamSearch={teamSearch} setTeamSearch={setTeamSearch} showNewTeam={showNewTeam} setShowNewTeam={setShowNewTeam} newTeamName={newTeamName} setNewTeamName={setNewTeamName} busy={busy} error={error} openTeamPicker={openTeamPicker} chooseTeam={chooseTeam} createTeam={createTeam} setSlot={setSlot} setStep={setStep} />;
  if (step === "players") return <PlayerStep
    team={playerSlot === "A" ? teamA! : teamB!}
    slot={playerSlot}
    availablePlayers={availablePlayers}
    teamA={teamA!}
    teamB={teamB!}
    playerQuery={playerQuery}
    setPlayerQuery={setPlayerQuery}
    selectedPlayerId={selectedPlayerId}
    setSelectedPlayerId={setSelectedPlayerId}
    playerNumber={playerNumber}
    setPlayerNumber={setPlayerNumber}
    showNewPlayer={showNewPlayer}
    setShowNewPlayer={setShowNewPlayer}
    newPlayerName={newPlayerName}
    setNewPlayerName={setNewPlayerName}
    newPlayerMobile={newPlayerMobile}
    setNewPlayerMobile={setNewPlayerMobile}
    busy={busy}
    error={error}
    addExistingPlayer={addExistingPlayer}
    addNewPlayer={addNewPlayer}
    continueAfterPlayers={continueAfterPlayers}
    back={() => setStep("teams")}
  />;
  return <DetailsStep teamA={teamA!} teamB={teamB!} overs={overs} setOvers={setOvers} date={date} setDate={setDate} venue={venue} setVenue={setVenue} error={error} busy={busy} submit={submit} back={() => setStep("teams")} />;
}

type TeamStepProps = {
  teamA: Team | null;
  teamB: Team | null;
  slot: Slot | null;
  otherTeam: Team | null;
  teams: Team[];
  teamSearch: string;
  setTeamSearch: (value: string) => void;
  showNewTeam: boolean;
  setShowNewTeam: (value: boolean) => void;
  newTeamName: string;
  setNewTeamName: (value: string) => void;
  busy: boolean;
  error: string | null;
  openTeamPicker: (slot: Slot) => void;
  chooseTeam: (team: Team) => void;
  createTeam: () => void;
  setSlot: (slot: Slot | null) => void;
  setStep: (step: Step) => void;
};

function TeamStep(props: TeamStepProps) {
  const { teamA, teamB, slot, otherTeam, teams, teamSearch, setTeamSearch, showNewTeam, setShowNewTeam, newTeamName, setNewTeamName, busy, error, openTeamPicker, chooseTeam, createTeam, setSlot, setStep } = props;
  if (!slot) {
    const notReady = (teamA && teamA.players.length < 2) || (teamB && teamB.players.length < 2);
    return (
      <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Select teams</h2>
        <p className="text-sm text-white/50">
          Add or confirm at least 2 players for each team inline, then choose the playing squad and roles right before the match starts.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TeamSlot label="Team A" team={teamA} onClick={() => openTeamPicker("A")} />
          <TeamSlot label="Team B" team={teamB} onClick={() => openTeamPicker("B")} />
        </div>
        {notReady && (
          <p className="text-xs text-amber-300/80">
            A selected team has fewer than 2 players.{" "}
            <Link href={teamA && teamA.players.length < 2 ? `/teams/${teamA.id}` : `/teams/${teamB!.id}`} className="underline hover:text-amber-200">
              Add players from its team page
            </Link>{" "}
            first.
          </p>
        )}
        {teamA && teamB && <button type="button" onClick={() => setStep("details")} className={buttonClass}>Continue</button>}
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </section>
    );
  }
  const matches = teams.filter((team: Team) => team.id !== otherTeam?.id && team.name.toLowerCase().includes(teamSearch.trim().toLowerCase()));
  return <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"><button type="button" onClick={() => setSlot(null)} className="text-sm text-white/50 hover:text-white">← Back to teams</button><h2 className="text-xl font-semibold">Choose Team {slot}</h2><input value={teamSearch} onChange={(event) => setTeamSearch(event.target.value)} placeholder="Search teams" className={inputClass} /><button type="button" onClick={() => setShowNewTeam(!showNewTeam)} className="w-full rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-200">+ Add new team</button>{showNewTeam && <div className="flex gap-2"><input value={newTeamName} onChange={(event) => setNewTeamName(event.target.value)} placeholder="New team name" className={inputClass} /><button type="button" onClick={createTeam} disabled={busy} className={buttonClass}>{busy ? "Adding…" : "Add"}</button></div>}<div className="space-y-2">{matches.map((team: Team) => <button key={team.id} type="button" onClick={() => chooseTeam(team)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:border-emerald-400/40"><span className="font-semibold">{team.name}</span><span className="text-xs text-white/50">{team.players.length} players</span></button>)}</div>{error && <p className="text-sm text-rose-400">{error}</p>}</section>;
}

type PlayerStepProps = {
  team: Team;
  slot: Slot;
  availablePlayers: EligiblePlayer[];
  teamA: Team;
  teamB: Team;
  playerQuery: string;
  setPlayerQuery: (query: string) => void;
  selectedPlayerId: string;
  setSelectedPlayerId: (id: string) => void;
  playerNumber: string;
  setPlayerNumber: (number: string) => void;
  showNewPlayer: boolean;
  setShowNewPlayer: (value: boolean) => void;
  newPlayerName: string;
  setNewPlayerName: (value: string) => void;
  newPlayerMobile: string;
  setNewPlayerMobile: (value: string) => void;
  busy: boolean;
  error: string | null;
  addExistingPlayer: () => Promise<void>;
  addNewPlayer: () => Promise<void>;
  continueAfterPlayers: () => void;
  back: () => void;
};

function PlayerStep(props: PlayerStepProps) {
  const {
    team, slot, availablePlayers, teamA, teamB,
    playerQuery, setPlayerQuery, selectedPlayerId, setSelectedPlayerId,
    playerNumber, setPlayerNumber, showNewPlayer, setShowNewPlayer,
    newPlayerName, setNewPlayerName, newPlayerMobile, setNewPlayerMobile,
    busy, error, addExistingPlayer, addNewPlayer, continueAfterPlayers, back,
  } = props;

  const existingIds = new Set(team.players.map((player) => player.playerId));
  const matchingPlayers = availablePlayers
    .filter((player) => !existingIds.has(player.id))
    .filter((player) => {
      const query = playerQuery.trim().toLowerCase();
      return !query || player.name.toLowerCase().includes(query) || player.mobile.includes(query);
    });

  return (
    <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <button type="button" onClick={back} className="text-sm text-white/50 hover:text-white">
        ← Change teams
      </button>
      <div>
        <h2 className="text-xl font-semibold">Add players to Team {slot}</h2>
        <p className="mt-1 text-sm text-white/50">
          {team.name} currently has {team.players.length} player{team.players.length === 1 ? "" : "s"}. Add at least 2.
        </p>
      </div>

      {team.players.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {team.players.map((player) => (
            <span key={player.playerId} className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
              {player.name}{player.playerNumber ? ` · #${player.playerNumber}` : ""}
            </span>
          ))}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-emerald-100/80">Add existing player</label>
        <input
          value={playerQuery}
          onChange={(event) => setPlayerQuery(event.target.value)}
          placeholder="Search by name or mobile number"
          className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
        />
        <div className="flex gap-2">
          <select
            value={selectedPlayerId}
            onChange={(event) => setSelectedPlayerId(event.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="" className="bg-[#0a1712]">Select a CricArena player…</option>
            {matchingPlayers.map((player) => (
              <option key={player.id} value={player.id} className="bg-[#0a1712]">
                {player.name} · {player.mobile}
              </option>
            ))}
          </select>
          <label className="w-28 shrink-0 text-xs text-white/50">
            Jersey no.
            <input
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={playerNumber}
              onChange={(event) => setPlayerNumber(event.target.value.replace(/\D/g, "").slice(0, 3))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => void addExistingPlayer()}
            disabled={busy || !selectedPlayerId || !/^\d{1,3}$/.test(playerNumber)}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowNewPlayer(!showNewPlayer)}
        className="w-full rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200"
      >
        + Add new player
      </button>

      {showNewPlayer && (
        <div className="space-y-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-3">
          <input
            value={newPlayerName}
            onChange={(event) => setNewPlayerName(event.target.value)}
            placeholder="Player full name"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          />
          <div className="flex gap-2">
            <input
              value={newPlayerMobile}
              onChange={(event) => setNewPlayerMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile number"
              inputMode="numeric"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            />
            <label className="w-28 shrink-0 text-xs text-white/50">
              Jersey no.
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                value={playerNumber}
                onChange={(event) => setPlayerNumber(event.target.value.replace(/\D/g, "").slice(0, 3))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void addNewPlayer()}
            disabled={busy}
            className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-40"
          >
            {busy ? "Adding…" : "Create and add player"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button
        type="button"
        onClick={continueAfterPlayers}
        disabled={busy || team.players.length < 2}
        className={buttonClass}
      >
        {slot === "A" ? "Continue to Team B" : teamA && teamB ? "Continue to match details" : "Continue"}
      </button>
    </section>
  );
}

type DetailsStepProps = {
  teamA: Team;
  teamB: Team;
  overs: string;
  setOvers: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  venue: string;
  setVenue: (value: string) => void;
  error: string | null;
  busy: boolean;
  submit: (event: React.FormEvent) => void;
  back: () => void;
};

function DetailsStep(props: DetailsStepProps) {
  const { teamA, teamB, overs, setOvers, date, setDate, venue, setVenue, error, busy, submit, back } = props;
  return <form onSubmit={submit} className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"><button type="button" onClick={back} className="text-sm text-white/50 hover:text-white">← Change teams</button><div className="text-sm text-emerald-300">{teamA.name} ({teamA.players.length} players) vs {teamB.name} ({teamB.players.length} players)</div><div className="grid gap-4 sm:grid-cols-3"><label className={labelClass}>Overs / side<input type="number" min={1} max={50} value={overs} onChange={(event) => setOvers(event.target.value)} className={inputClass} /></label><label className={labelClass}>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${inputClass} [color-scheme:dark]`} /></label><label className={labelClass}>Venue<input value={venue} onChange={(event) => setVenue(event.target.value)} placeholder="Optional" className={inputClass} /></label></div><p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] px-4 py-3 text-sm text-amber-200/90">🪙 The toss, playing XI, 12th man, and roles aren&apos;t needed yet — they&apos;re all decided when the match actually starts, from the scorer screen.</p>{error && <p className="text-sm text-rose-400">{error}</p>}<button type="submit" disabled={busy} className={buttonClass}>{busy ? "Creating…" : "Create match & open scorer"}</button></form>;
}

function TeamSlot({ label, team, onClick }: { label: string; team: Team | null; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="min-h-28 rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-5 text-left transition hover:border-emerald-400/50">{team ? <><div className="text-xs uppercase tracking-wide text-white/40">{label}</div><div className="mt-2 font-semibold text-white">{team.name}</div><div className="mt-1 text-sm text-white/50">{team.players.length} players · Change team</div></> : <><div className="text-3xl text-emerald-300">+</div><div className="mt-1 font-semibold text-white">Add {label}</div><div className="mt-1 text-sm text-white/50">Choose an existing team or add a new one</div></>}</button>;
}
