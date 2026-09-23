import type { PlayerStats } from "./stats";

/**
 * SMPL points & rating — a lightweight, transparent scoring model derived from
 * a player's aggregated match stats. Pure functions (no I/O) so they are safe
 * to use on the client too.
 */
export function computePoints(s: PlayerStats): number {
  const batting = s.runs + s.fours + s.sixes * 2;
  const bowling = s.wickets * 20 + s.maidens * 5;
  const fielding = s.catches * 8 + s.stumpings * 12 + s.runOuts * 8;
  return batting + bowling + fielding;
}

export function pointsPerMatch(points: number, matches: number): number {
  return matches > 0 ? Math.round(points / matches) : 0;
}

export interface RatingTier {
  label: string;
  stars: number;
}

export function ratingTier(ppm: number): RatingTier {
  if (ppm >= 90) return { label: "Elite", stars: 5 };
  if (ppm >= 70) return { label: "Star", stars: 4 };
  if (ppm >= 50) return { label: "Pro", stars: 3 };
  if (ppm >= 25) return { label: "Rising", stars: 2 };
  return { label: "Rookie", stars: 1 };
}

/** Batting-only contribution — used to rank the best batters. */
export function battingPoints(s: PlayerStats): number {
  return s.runs + s.fours + s.sixes * 2;
}

/** Bowling-only contribution — used to rank the best bowlers. */
export function bowlingPoints(s: PlayerStats): number {
  return s.wickets * 20 + s.maidens * 5;
}
