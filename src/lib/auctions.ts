import { readStoredArray, writeStoredArray } from "./mongo";

export type AuctionStatus = "setup" | "live" | "completed";
export type AuctionPlayerStatus = "pending" | "current" | "sold" | "unsold";

export interface AuctionPlayer {
  id: string;
  registrationId?: string;
  name: string;
  basePrice: number;
  category: string;
  status: AuctionPlayerStatus;
  round: number;
  soldToTeamId?: string;
  soldPrice?: number;
}

export interface AuctionSquadPlayer {
  playerId: string;
  name: string;
  price: number;
  category: string;
}

export interface AuctionTeam {
  id: string;
  name: string;
  initialPurse: number;
  purse: number;
  players: AuctionSquadPlayer[];
}

export interface AuctionBid {
  teamId: string;
  teamName: string;
  amount: number;
  at: string;
}

export interface Auction {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  status: AuctionStatus;
  round: number;
  initialPurse: number;
  /** Base price given to every player who self-registers. */
  defaultBasePrice: number;
  /** Optional — the auction date/time, and the single tournament it's
   * dedicated to, if any. Purely informational; registration eligibility
   * isn't restricted by this link. */
  date?: string;
  time?: string;
  tournamentId?: string;
  /** Optional venue (or "Online") and a short description, shown on the
   * auction's card/page. Purely informational. */
  venue?: string;
  description?: string;
  teams: AuctionTeam[];
  players: AuctionPlayer[];
  currentPlayerId?: string;
  currentBid?: number;
  currentBidTeamId?: string;
  bidHistory: AuctionBid[];
  createdAt: string;
  completedAt?: string;
}

async function readAll(): Promise<Auction[]> {
  return readStoredArray<Auction>("auctions", "auctions.json");
}

async function writeAll(items: Auction[]): Promise<void> {
  await writeStoredArray("auctions", "auctions.json", items);
}

function nextId(items: Auction[]): string {
  const max = items.reduce((value, auction) => {
    const match = /^AUC-(\d+)$/.exec(auction.id);
    return Math.max(value, match ? Number(match[1]) : 0);
  }, 0);
  return `AUC-${String(max + 1).padStart(3, "0")}`;
}

export async function listAuctions(): Promise<Auction[]> {
  return (await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAuction(id: string): Promise<Auction | undefined> {
  return (await readAll()).find((auction) => auction.id === id);
}

export async function createAuction(input: {
  name: string;
  ownerId: string;
  ownerName: string;
  purse: number;
  defaultBasePrice: number;
  date?: string;
  time?: string;
  tournamentId?: string;
  venue?: string;
  description?: string;
}): Promise<Auction> {
  const auctions = await readAll();
  // Teams and players are no longer picked upfront — they self-register
  // (players) or are added by the owner (teams) once the auction exists.
  const auction: Auction = {
    id: nextId(auctions),
    name: input.name,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    status: "setup",
    round: 1,
    initialPurse: input.purse,
    defaultBasePrice: input.defaultBasePrice,
    date: input.date,
    time: input.time,
    tournamentId: input.tournamentId,
    venue: input.venue,
    description: input.description,
    teams: [],
    players: [],
    bidHistory: [],
    createdAt: new Date().toISOString(),
  };
  auctions.push(auction);
  await writeAll(auctions);
  return auction;
}

function nextAuctionPlayerId(auction: Auction): string {
  const max = auction.players.reduce((value, player) => {
    const match = /^AP-(\d+)$/.exec(player.id);
    return Math.max(value, match ? Number(match[1]) : 0);
  }, 0);
  return `AP-${String(max + 1).padStart(4, "0")}`;
}

export type AuctionMutationResult = Auction | "not-found" | "not-setup" | "already-registered" | "invalid";

/** A registered player adds themselves to an auction's player pool. */
export async function registerPlayerForAuction(
  auctionId: string,
  player: { id: string; name: string; playerType?: string },
): Promise<AuctionMutationResult> {
  const auctions = await readAll();
  const auction = auctions.find((item) => item.id === auctionId);
  if (!auction) return "not-found";
  if (auction.status !== "setup") return "not-setup";
  if (auction.players.some((item) => item.registrationId === player.id)) return "already-registered";
  auction.players.push({
    id: nextAuctionPlayerId(auction),
    registrationId: player.id,
    name: player.name,
    basePrice: auction.defaultBasePrice,
    category: player.playerType ?? "All-Rounder",
    status: "pending",
    round: 1,
  });
  await writeAll(auctions);
  return auction;
}

/** Removes a self-registered player from the pool (only before the auction goes live). */
export async function withdrawPlayerFromAuction(
  auctionId: string,
  registrationId: string,
): Promise<AuctionMutationResult> {
  const auctions = await readAll();
  const auction = auctions.find((item) => item.id === auctionId);
  if (!auction) return "not-found";
  if (auction.status !== "setup") return "not-setup";
  const before = auction.players.length;
  auction.players = auction.players.filter((player) => player.registrationId !== registrationId);
  if (auction.players.length === before) return "invalid";
  await writeAll(auctions);
  return auction;
}

/** Owner/admin adds a team to the auction (see isAuctionOwner for who may call this). */
export async function registerTeamForAuction(
  auctionId: string,
  team: { id: string; name: string },
): Promise<AuctionMutationResult> {
  const auctions = await readAll();
  const auction = auctions.find((item) => item.id === auctionId);
  if (!auction) return "not-found";
  if (auction.status !== "setup") return "not-setup";
  if (auction.teams.some((item) => item.id === team.id)) return "already-registered";
  auction.teams.push({
    id: team.id,
    name: team.name,
    initialPurse: auction.initialPurse,
    purse: auction.initialPurse,
    players: [],
  });
  await writeAll(auctions);
  return auction;
}

/** Owner/admin removes a team from the auction (only before it goes live). */
export async function withdrawTeamFromAuction(
  auctionId: string,
  teamId: string,
): Promise<AuctionMutationResult> {
  const auctions = await readAll();
  const auction = auctions.find((item) => item.id === auctionId);
  if (!auction) return "not-found";
  if (auction.status !== "setup") return "not-setup";
  const before = auction.teams.length;
  auction.teams = auction.teams.filter((team) => team.id !== teamId);
  if (auction.teams.length === before) return "invalid";
  await writeAll(auctions);
  return auction;
}

function nextPending(auction: Auction): AuctionPlayer | undefined {
  return auction.players.find((player) => player.status === "pending") ?? auction.players.find((player) => player.status === "unsold");
}

export async function startNextPlayer(id: string): Promise<Auction | "not-found" | "complete"> {
  const auctions = await readAll();
  const index = auctions.findIndex((auction) => auction.id === id);
  if (index === -1) return "not-found";
  const auction = auctions[index];
  const hasPending = auction.players.some((player) => player.status === "pending");
  const next = nextPending(auction);
  if (!next) {
    auction.status = "completed";
    auction.currentPlayerId = undefined;
    auction.currentBid = undefined;
    auction.currentBidTeamId = undefined;
    auction.completedAt = new Date().toISOString();
    await writeAll(auctions);
    return "complete";
  }
  if (!hasPending && auction.players.some((player) => player.status === "unsold")) {
    auction.round += 1;
  }
  auction.status = "live";
  auction.currentPlayerId = next.id;
  auction.currentBid = undefined;
  auction.currentBidTeamId = undefined;
  next.status = "current";
  next.round = auction.round;
  await writeAll(auctions);
  return auction;
}

export async function placeBid(id: string, teamId: string, amount: number): Promise<Auction | "not-found" | "invalid"> {
  const auctions = await readAll();
  const index = auctions.findIndex((auction) => auction.id === id);
  if (index === -1) return "not-found";
  const auction = auctions[index];
  const player = auction.players.find((item) => item.id === auction.currentPlayerId);
  const team = auction.teams.find((item) => item.id === teamId);
  if (!player || player.status !== "current" || !team || teamId === auction.currentBidTeamId) return "invalid";
  const minimumNextBid = auction.currentBid === undefined ? player.basePrice : auction.currentBid + 1000;
  if (amount !== minimumNextBid || amount > team.purse) return "invalid";
  auction.currentBid = amount;
  auction.currentBidTeamId = teamId;
  auction.bidHistory.push({ teamId, teamName: team.name, amount, at: new Date().toISOString() });
  await writeAll(auctions);
  return auction;
}

export async function settleCurrent(id: string, result: "sold" | "unsold"): Promise<Auction | "not-found" | "invalid"> {
  const auctions = await readAll();
  const index = auctions.findIndex((auction) => auction.id === id);
  if (index === -1) return "not-found";
  const auction = auctions[index];
  const player = auction.players.find((item) => item.id === auction.currentPlayerId);
  if (!player || player.status !== "current") return "invalid";
  if (result === "sold") {
    const team = auction.teams.find((item) => item.id === auction.currentBidTeamId);
    const price = auction.currentBid ?? player.basePrice;
    if (!team || price > team.purse) return "invalid";
    team.purse -= price;
    team.players.push({ playerId: player.registrationId ?? player.id, name: player.name, price, category: player.category });
    player.status = "sold";
    player.soldToTeamId = team.id;
    player.soldPrice = price;
  } else {
    player.status = "unsold";
  }
  auction.currentPlayerId = undefined;
  auction.currentBid = undefined;
  auction.currentBidTeamId = undefined;
  await writeAll(auctions);
  return auction;
}

export function isAuctionOwner(auction: Pick<Auction, "ownerId">, user: { id: string; isAdmin: boolean }): boolean {
  return user.isAdmin || auction.ownerId === user.id;
}
