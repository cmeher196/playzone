import { readStoredArray, writeStoredArray } from "./mongo";
import { listPlayers } from "./registrations";
import { listTeams } from "./teams";

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
  teamIds: string[];
  playerIds: string[];
}): Promise<Auction> {
  const [auctions, registeredPlayers, registeredTeams] = await Promise.all([
    readAll(),
    listPlayers(),
    listTeams(),
  ]);
  const teamSet = new Set(input.teamIds);
  const playerSet = new Set(input.playerIds);
  const teams: AuctionTeam[] = registeredTeams
    .filter((team) => teamSet.has(team.id))
    .map((team) => ({ id: team.id, name: team.name, initialPurse: input.purse, purse: input.purse, players: [] }));
  const players: AuctionPlayer[] = registeredPlayers
    .filter((player) => playerSet.has(player.id))
    .map((player, index) => ({
      id: `AP-${String(index + 1).padStart(4, "0")}`,
      registrationId: player.id,
      name: player.name,
      basePrice: 1000,
      category: player.playerType ?? "All-Rounder",
      status: "pending",
      round: 1,
    }));
  if (teams.length < 2) throw new Error("Select at least two teams.");
  if (players.length < 1) throw new Error("Select at least one player.");
  const auction: Auction = {
    id: nextId(auctions), name: input.name, ownerId: input.ownerId, ownerName: input.ownerName,
    status: "setup", round: 1, initialPurse: input.purse, teams, players,
    bidHistory: [], createdAt: new Date().toISOString(),
  };
  auctions.push(auction);
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
