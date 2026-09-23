"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Team } from "@/lib/teams";

type Slot = "A" | "B";
type Step = "teams" | "players" | "roles" | "details";
type CoinSide = "Heads" | "Tails";
type PlayerOption = { id: string; name: string; mobile: string };

type RoleState = { captain: string; viceCaptain: string; wicketkeeper: string };

const inputClass = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";
const buttonClass = "rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:from-emerald-400 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "mb-1.5 block text-sm font-medium text-emerald-100/80";

export function MatchSetupWizard({
  tournamentId,
  initialTeams,
  availablePlayers,
}: {
  tournamentId?: string;
  initialTeams: Team[];
  availablePlayers: PlayerOption[];
}) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);
  const [teamA, setTeamA] = useState<Team | null>(null);
  const [teamB, setTeamB] = useState<Team | null>(null);
  const [step, setStep] = useState<Step>("teams");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [selected, setSelected] = useState<Record<Slot, string[]>>({ A: [], B: [] });
  const [roles, setRoles] = useState<Record<Slot, RoleState>>({
    A: { captain: "", viceCaptain: "", wicketkeeper: "" },
    B: { captain: "", viceCaptain: "", wicketkeeper: "" },
  });
  const [newTeamName, setNewTeamName] = useState("");
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newPlayerId, setNewPlayerId] = useState("");
  const [showNewPlayer, setShowNewPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerMobile, setNewPlayerMobile] = useState("");
  const [overs, setOvers] = useState("6");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [venue, setVenue] = useState("");
  const [caller, setCaller] = useState("");
  const [callerSide, setCallerSide] = useState<CoinSide>("Heads");
  const [coinResult, setCoinResult] = useState<CoinSide | null>(null);
  const [winner, setWinner] = useState("");
  const [decision, setDecision] = useState<"bat" | "bowl">("bat");
  const [flipping, setFlipping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTeam = slot === "A" ? teamA : teamB;
  const otherTeam = slot === "A" ? teamB : teamA;
  const currentSelected = slot ? selected[slot] : [];
  const squadsReady = Boolean(teamA && teamB && selected.A.length >= 2 && selected.B.length >= 2);

  function openTeamPicker(nextSlot: Slot) {
    setSlot(nextSlot);
    setStep("teams");
    setTeamSearch("");
    setError(null);
  }

  function chooseTeam(team: Team) {
    if (!slot) return;
    if (slot === "A") setTeamA(team);
    else setTeamB(team);
    setSelected((value) => ({ ...value, [slot]: team.players.map((player) => player.playerId) }));
    setRoles((value) => ({
      ...value,
      [slot]: { captain: team.captainId ?? "", viceCaptain: team.viceCaptainId ?? "", wicketkeeper: "" },
    }));
    setStep("players");
    setTeamSearch("");
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

  async function addPlayer() {
    if (!currentTeam || !slot || !newPlayerId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: newPlayerId, playerNumber: "1" }),
      });
      const data = (await response.json()) as { error?: string; team?: Team };
      if (!response.ok || !data.team) {
        setError(data.error ?? "Could not add the player.");
        return;
      }
      setTeams((value) => value.map((team) => (team.id === data.team!.id ? data.team! : team)));
      if (slot === "A") setTeamA(data.team);
      else setTeamB(data.team);
      setSelected((value) => ({ ...value, [slot]: [...value[slot], newPlayerId] }));
      setNewPlayerId("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function addNewPlayer() {
    if (!currentTeam || !slot || newPlayerName.trim().length < 2 || !/^[6-9]\d{9}$/.test(newPlayerMobile)) {
      setError("Enter a player name and valid 10-digit mobile number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPlayer: { name: newPlayerName.trim(), mobile: newPlayerMobile }, playerNumber: "1" }),
      });
      const data = (await response.json()) as { error?: string; team?: Team };
      if (!response.ok || !data.team) {
        setError(data.error ?? "Could not add the new player.");
        return;
      }
      setTeams((value) => value.map((team) => (team.id === data.team!.id ? data.team! : team)));
      if (slot === "A") setTeamA(data.team);
      else setTeamB(data.team);
      const added = data.team.players[data.team.players.length - 1];
      setSelected((value) => ({ ...value, [slot]: [...value[slot], added.playerId] }));
      setNewPlayerName("");
      setNewPlayerMobile("");
      setShowNewPlayer(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function finishPlayers() {
    if (!slot || currentSelected.length < 2) {
      setError("Select at least two players.");
      return;
    }
    setError(null);
    if (slot === "A" && !teamB) {
      setSlot(null);
      setStep("teams");
    } else if (slot === "B") {
      setSlot("A");
      setStep("roles");
    } else {
      setStep("roles");
    }
  }

  function flipCoin() {
    if (!caller || flipping || !squadsReady) return;
    setFlipping(true);
    setCoinResult(null);
    window.setTimeout(() => {
      const result: CoinSide = Math.random() < 0.5 ? "Heads" : "Tails";
      const otherId = caller === teamA!.id ? teamB!.id : teamA!.id;
      setCoinResult(result);
      setWinner(result === callerSide ? caller : otherId);
      setFlipping(false);
    }, 750);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!teamA || !teamB || !squadsReady || !coinResult) {
      setError("Complete both squads and the toss first.");
      return;
    }
    const oversNumber = Number(overs);
    if (!Number.isInteger(oversNumber) || oversNumber < 1 || oversNumber > 50) {
      setError("Enter between 1 and 50 overs.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(tournamentId ? `/api/tournaments/${tournamentId}/matches` : "/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tournamentId ? {
          teamAId: teamA.id,
          teamBId: teamB.id,
          teamAPlayerIds: selected.A,
          teamBPlayerIds: selected.B,
          overs: oversNumber,
          date,
          venue: venue.trim() || undefined,
          tossWinnerId: winner,
          tossDecision: decision,
        } : {
          teamAName: teamA.name,
          teamBName: teamB.name,
          teamAPlayers: teamA.players.filter((player) => selected.A.includes(player.playerId)).map((player) => player.name),
          teamBPlayers: teamB.players.filter((player) => selected.B.includes(player.playerId)).map((player) => player.name),
          overs: oversNumber,
          date,
          venue: venue.trim() || undefined,
          tossWinnerId: winner === teamA.id ? "direct-a" : "direct-b",
          tossDecision: decision,
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

  if (step === "teams") return <TeamStep teamA={teamA} teamB={teamB} slot={slot} otherTeam={otherTeam} teams={teams} teamSearch={teamSearch} setTeamSearch={setTeamSearch} showNewTeam={showNewTeam} setShowNewTeam={setShowNewTeam} newTeamName={newTeamName} setNewTeamName={setNewTeamName} busy={busy} error={error} openTeamPicker={openTeamPicker} chooseTeam={chooseTeam} createTeam={createTeam} setSlot={setSlot} setStep={setStep} />;
  if (step === "players") return <PlayerStep slot={slot!} team={currentTeam!} selected={currentSelected} playerSearch={playerSearch} setPlayerSearch={setPlayerSearch} availablePlayers={availablePlayers} newPlayerId={newPlayerId} setNewPlayerId={setNewPlayerId} addPlayer={addPlayer} showNewPlayer={showNewPlayer} setShowNewPlayer={setShowNewPlayer} newPlayerName={newPlayerName} setNewPlayerName={setNewPlayerName} newPlayerMobile={newPlayerMobile} setNewPlayerMobile={setNewPlayerMobile} addNewPlayer={addNewPlayer} busy={busy} error={error} togglePlayer={(id: string) => setSelected((value) => ({ ...value, [slot!]: value[slot!].includes(id) ? value[slot!].filter((item) => item !== id) : [...value[slot!], id] }))} finishPlayers={finishPlayers} back={() => { setSlot(null); setStep("teams"); }} />;
  if (step === "roles") return <RoleStep slot={slot!} team={slot === "A" ? teamA! : teamB!} selected={selected[slot!]} roles={roles[slot!]} setRoles={(value: RoleState) => setRoles((current) => ({ ...current, [slot!]: value }))} error={error} continueStep={() => { const value = roles[slot!]; if (!value.captain || !value.viceCaptain || !value.wicketkeeper) { setError("Choose all three roles."); return; } setError(null); if (slot === "A") { setSlot("B"); setStep("roles"); } else { setSlot(null); setStep("details"); } }} />;
  return <DetailsStep teamA={teamA!} teamB={teamB!} overs={overs} setOvers={setOvers} date={date} setDate={setDate} venue={venue} setVenue={setVenue} caller={caller} setCaller={(value: string) => { setCaller(value); setCoinResult(null); }} callerSide={callerSide} setCallerSide={(value: CoinSide) => { setCallerSide(value); setCoinResult(null); }} coinResult={coinResult} winner={winner} decision={decision} setDecision={setDecision} flipping={flipping} flipCoin={flipCoin} error={error} busy={busy} submit={submit} back={() => setStep("teams")} />;
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
  if (!slot) return <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"><h2 className="text-xl font-semibold">Select teams</h2><div className="grid gap-4 sm:grid-cols-2"><TeamSlot label="Team A" team={teamA} onClick={() => openTeamPicker("A")} /><TeamSlot label="Team B" team={teamB} onClick={() => openTeamPicker("B")} /></div>{teamA && teamB && <button type="button" onClick={() => { setSlot("A"); setStep("roles"); }} className={buttonClass}>Continue to roles</button>}{error && <p className="text-sm text-rose-400">{error}</p>}</section>;
  const matches = teams.filter((team: Team) => team.id !== otherTeam?.id && team.name.toLowerCase().includes(teamSearch.trim().toLowerCase()));
  return <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"><button type="button" onClick={() => setSlot(null)} className="text-sm text-white/50 hover:text-white">← Back to teams</button><h2 className="text-xl font-semibold">Choose Team {slot}</h2><input value={teamSearch} onChange={(event) => setTeamSearch(event.target.value)} placeholder="Search teams" className={inputClass} /><button type="button" onClick={() => setShowNewTeam(!showNewTeam)} className="w-full rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-200">+ Add new team</button>{showNewTeam && <div className="flex gap-2"><input value={newTeamName} onChange={(event) => setNewTeamName(event.target.value)} placeholder="New team name" className={inputClass} /><button type="button" onClick={createTeam} disabled={busy} className={buttonClass}>Add</button></div>}<div className="space-y-2">{matches.map((team: Team) => <button key={team.id} type="button" onClick={() => chooseTeam(team)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:border-emerald-400/40"><span className="font-semibold">{team.name}</span><span className="text-xs text-white/50">{team.players.length} players</span></button>)}</div>{error && <p className="text-sm text-rose-400">{error}</p>}</section>;
}

type PlayerStepProps = {
  slot: Slot;
  team: Team;
  selected: string[];
  playerSearch: string;
  setPlayerSearch: (value: string) => void;
  availablePlayers: PlayerOption[];
  newPlayerId: string;
  setNewPlayerId: (value: string) => void;
  addPlayer: () => void;
  showNewPlayer: boolean;
  setShowNewPlayer: (value: boolean) => void;
  newPlayerName: string;
  setNewPlayerName: (value: string) => void;
  newPlayerMobile: string;
  setNewPlayerMobile: (value: string) => void;
  addNewPlayer: () => void;
  busy: boolean;
  error: string | null;
  togglePlayer: (id: string) => void;
  finishPlayers: () => void;
  back: () => void;
};

function PlayerStep(props: PlayerStepProps) {
  const { slot, team, selected, playerSearch, setPlayerSearch, availablePlayers, newPlayerId, setNewPlayerId, addPlayer, showNewPlayer, setShowNewPlayer, newPlayerName, setNewPlayerName, newPlayerMobile, setNewPlayerMobile, addNewPlayer, busy, error, togglePlayer, finishPlayers, back } = props;
  const players = team.players.filter((player: { name: string }) => player.name.toLowerCase().includes(playerSearch.trim().toLowerCase()));
  const options = availablePlayers.filter((player: PlayerOption) => !selected.includes(player.id) && `${player.name} ${player.mobile}`.toLowerCase().includes(playerSearch.trim().toLowerCase()));
  return <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"><button type="button" onClick={back} className="text-sm text-white/50 hover:text-white">← Back to teams</button><h2 className="text-xl font-semibold">Team {slot} players</h2><input value={playerSearch} onChange={(event) => setPlayerSearch(event.target.value)} placeholder="Search players" className={inputClass} /><div className="flex gap-2"><select value={newPlayerId} onChange={(event) => setNewPlayerId(event.target.value)} className={inputClass}><option value="">Add a registered player</option>{options.map((player) => <option key={player.id} value={player.id}>{player.name} · {player.mobile}</option>)}</select><button type="button" onClick={addPlayer} disabled={busy || !newPlayerId} className={buttonClass}>Add player</button></div><button type="button" onClick={() => setShowNewPlayer(!showNewPlayer)} className="w-full rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-200">+ Add new player</button>{showNewPlayer && <div className="space-y-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4"><input value={newPlayerName} onChange={(event) => setNewPlayerName(event.target.value)} placeholder="Player full name" className={inputClass} /><input value={newPlayerMobile} onChange={(event) => setNewPlayerMobile(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" inputMode="numeric" className={inputClass} /><button type="button" onClick={addNewPlayer} disabled={busy} className={buttonClass}>Create and add player</button></div>}<div className="grid gap-2 sm:grid-cols-2">{players.map((player: { playerId: string; name: string }) => <label key={player.playerId} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"><input type="checkbox" checked={selected.includes(player.playerId)} onChange={() => togglePlayer(player.playerId)} className="h-4 w-4 accent-emerald-400" /><span>{player.name}</span></label>)}</div><p className="text-sm text-white/50">{selected.length} selected</p>{error && <p className="text-sm text-rose-400">{error}</p>}<button type="button" onClick={finishPlayers} className={buttonClass}>Continue</button></section>;
}

type RoleStepProps = {
  slot: Slot;
  team: Team;
  selected: string[];
  roles: RoleState;
  setRoles: (value: RoleState) => void;
  error: string | null;
  continueStep: () => void;
};

function RoleStep(props: RoleStepProps) {
  const { slot, team, selected, roles, setRoles, error, continueStep } = props;
  const players = team.players.filter((player: { playerId: string }) => selected.includes(player.playerId));
  return <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"><h2 className="text-xl font-semibold">Team {slot} roles</h2><p className="text-sm text-white/50">Choose captain, vice-captain and wicketkeeper.</p>{(["captain", "viceCaptain", "wicketkeeper"] as const).map((key) => <label key={key} className={labelClass}>{key === "captain" ? "Captain" : key === "viceCaptain" ? "Vice-captain" : "Wicketkeeper"}<select value={roles[key]} onChange={(event) => setRoles({ ...roles, [key]: event.target.value })} className={inputClass}><option value="">Select player</option>{players.map((player: { playerId: string; name: string }) => <option key={player.playerId} value={player.playerId}>{player.name}</option>)}</select></label>)}{error && <p className="text-sm text-rose-400">{error}</p>}<button type="button" onClick={continueStep} className={buttonClass}>Continue</button></section>;
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
  caller: string;
  setCaller: (value: string) => void;
  callerSide: CoinSide;
  setCallerSide: (value: CoinSide) => void;
  coinResult: CoinSide | null;
  winner: string;
  decision: "bat" | "bowl";
  setDecision: (value: "bat" | "bowl") => void;
  flipping: boolean;
  flipCoin: () => void;
  error: string | null;
  busy: boolean;
  submit: (event: React.FormEvent) => void;
  back: () => void;
};

function DetailsStep(props: DetailsStepProps) {
  const { teamA, teamB, overs, setOvers, date, setDate, venue, setVenue, caller, setCaller, callerSide, setCallerSide, coinResult, winner, decision, setDecision, flipping, flipCoin, error, busy, submit, back } = props;
  return <form onSubmit={submit} className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"><button type="button" onClick={back} className="text-sm text-white/50 hover:text-white">← Change teams</button><div className="text-sm text-emerald-300">{teamA.name} vs {teamB.name}</div><div className="grid gap-4 sm:grid-cols-3"><label className={labelClass}>Overs / side<input type="number" min={1} max={50} value={overs} onChange={(event) => setOvers(event.target.value)} className={inputClass} /></label><label className={labelClass}>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${inputClass} [color-scheme:dark]`} /></label><label className={labelClass}>Venue<input value={venue} onChange={(event) => setVenue(event.target.value)} placeholder="Optional" className={inputClass} /></label></div><div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-4"><h2 className="font-semibold text-amber-200">Toss</h2><p className="mt-1 text-xs text-white/50">Choose the calling team and side, then flip the coin.</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><select value={caller} onChange={(event) => { setCaller(event.target.value); setCallerSide("Heads"); }} className={inputClass}><option value="">Calling team</option><option value={teamA.id}>{teamA.name}</option><option value={teamB.id}>{teamB.name}</option></select><div className="grid grid-cols-2 gap-2">{(["Heads", "Tails"] as const).map((side) => <button type="button" key={side} onClick={() => setCallerSide(side)} className={`rounded-xl border px-3 py-2 text-sm ${callerSide === side ? "border-amber-300 bg-amber-300/15 text-amber-200" : "border-white/10 text-white/70"}`}>{side}</button>)}</div><button type="button" disabled={!caller || flipping} onClick={flipCoin} className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-amber-200 disabled:opacity-50">{flipping ? "Flipping…" : coinResult ?? "Flip coin"}</button></div>{coinResult && <p className="mt-3 text-sm text-white/80">{winner === teamA.id ? teamA.name : teamB.name} won the toss.</p>}<div className="mt-3 grid grid-cols-2 gap-2">{(["bat", "bowl"] as const).map((value) => <button type="button" key={value} disabled={!coinResult} onClick={() => setDecision(value)} className={`rounded-xl border px-3 py-2 text-sm capitalize disabled:opacity-40 ${decision === value ? "border-emerald-400 bg-emerald-400/15 text-emerald-200" : "border-white/10 text-white/70"}`}>{value}</button>)}</div></div>{error && <p className="text-sm text-rose-400">{error}</p>}<button type="submit" disabled={busy || !coinResult} className={buttonClass}>{busy ? "Creating…" : "Create match & open scorer"}</button></form>;
}

function TeamSlot({ label, team, onClick }: { label: string; team: Team | null; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="min-h-28 rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-5 text-left transition hover:border-emerald-400/50">{team ? <><div className="text-xs uppercase tracking-wide text-white/40">{label}</div><div className="mt-2 font-semibold text-white">{team.name}</div><div className="mt-1 text-sm text-white/50">{team.players.length} players · Change team</div></> : <><div className="text-3xl text-emerald-300">+</div><div className="mt-1 font-semibold text-white">Add {label}</div><div className="mt-1 text-sm text-white/50">Choose an existing team or add a new one</div></>}</button>;
}
