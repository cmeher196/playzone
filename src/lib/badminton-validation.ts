// Badminton tournament and match validation schemas
import type { BadmintonMatchFormat } from "./badminton-tournaments";

export const BADMINTON_MIN_COURT_COUNT = 1;
export const BADMINTON_MAX_COURT_COUNT = 16;
export const BADMINTON_MIN_BEST_OF = 1;
export const BADMINTON_MAX_BEST_OF = 15;
export const BADMINTON_MIN_POINTS_TO_WIN = 5;
export const BADMINTON_MAX_POINTS_TO_WIN = 99;
export const BADMINTON_DEFAULT_BEST_OF = 3;
export const BADMINTON_DEFAULT_POINTS_TO_WIN = 21;

export interface CreateBadmintonTournamentInput {
  name: string;
  description?: string;
  venue?: string;
  courtCount: number;
  bestOf: number;
  pointsToWin: number;
}

export function validateBadmintonTournamentInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: CreateBadmintonTournamentInput;
} {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Input must be an object"] };
  }

  const data = input as Record<string, unknown>;

  // name
  if (!data.name || typeof data.name !== "string") {
    errors.push("Tournament name is required and must be a string");
  } else if (data.name.trim().length === 0) {
    errors.push("Tournament name cannot be empty");
  } else if (data.name.length > 100) {
    errors.push("Tournament name must be 100 characters or less");
  }

  // description
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== "string") {
      errors.push("Description must be a string");
    } else if (data.description.length > 500) {
      errors.push("Description must be 500 characters or less");
    }
  }

  // venue
  if (data.venue !== undefined && data.venue !== null) {
    if (typeof data.venue !== "string") {
      errors.push("Venue must be a string");
    } else if (data.venue.length > 100) {
      errors.push("Venue must be 100 characters or less");
    }
  }

  // courtCount
  if (data.courtCount === undefined || data.courtCount === null) {
    errors.push("Court count is required");
  } else if (!Number.isInteger(data.courtCount)) {
    errors.push("Court count must be an integer");
  } else if (
    (data.courtCount as number) < BADMINTON_MIN_COURT_COUNT ||
    (data.courtCount as number) > BADMINTON_MAX_COURT_COUNT
  ) {
    errors.push(`Court count must be between ${BADMINTON_MIN_COURT_COUNT} and ${BADMINTON_MAX_COURT_COUNT}`);
  }

  // bestOf (optional, default 3)
  if (data.bestOf !== undefined && data.bestOf !== null) {
    if (!Number.isInteger(data.bestOf)) {
      errors.push("Number of games must be an integer");
    } else if ((data.bestOf as number) < BADMINTON_MIN_BEST_OF || (data.bestOf as number) > BADMINTON_MAX_BEST_OF) {
      errors.push(`Number of games must be between ${BADMINTON_MIN_BEST_OF} and ${BADMINTON_MAX_BEST_OF}`);
    }
  }

  // pointsToWin (optional, default 21)
  if (data.pointsToWin !== undefined && data.pointsToWin !== null) {
    if (!Number.isInteger(data.pointsToWin)) {
      errors.push("Points per game must be an integer");
    } else if (
      (data.pointsToWin as number) < BADMINTON_MIN_POINTS_TO_WIN ||
      (data.pointsToWin as number) > BADMINTON_MAX_POINTS_TO_WIN
    ) {
      errors.push(
        `Points per game must be between ${BADMINTON_MIN_POINTS_TO_WIN} and ${BADMINTON_MAX_POINTS_TO_WIN}`,
      );
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      name: (data.name as string).trim(),
      description: data.description ? (data.description as string).trim() || undefined : undefined,
      venue: data.venue ? (data.venue as string).trim() || undefined : undefined,
      courtCount: data.courtCount as number,
      bestOf:
        data.bestOf === undefined || data.bestOf === null
          ? BADMINTON_DEFAULT_BEST_OF
          : (data.bestOf as number),
      pointsToWin:
        data.pointsToWin === undefined || data.pointsToWin === null
          ? BADMINTON_DEFAULT_POINTS_TO_WIN
          : (data.pointsToWin as number),
    },
  };
}

export interface CreateBadmintonMatchInput {
  courtId: string;
  format: BadmintonMatchFormat;
  playerA: string;
  playerB: string;
  playerC?: string;
  playerD?: string;
  bestOf?: number;
  pointsToWin?: number;
}

export function validateBadmintonMatchInput(
  input: unknown,
  format?: BadmintonMatchFormat,
): {
  valid: boolean;
  errors: string[];
  data?: CreateBadmintonMatchInput;
} {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Input must be an object"] };
  }

  const data = input as Record<string, unknown>;

  // courtId
  if (!data.courtId || typeof data.courtId !== "string") {
    errors.push("Court ID is required and must be a string");
  }

  // format
  if (!data.format || (data.format !== "singles" && data.format !== "doubles")) {
    errors.push("Format must be 'singles' or 'doubles'");
  }
  const matchFormat = (data.format ?? format) as BadmintonMatchFormat;

  // playerA
  if (!data.playerA || typeof data.playerA !== "string") {
    errors.push("Player A ID is required");
  }

  // playerB
  if (!data.playerB || typeof data.playerB !== "string") {
    errors.push("Player B ID is required");
  }

  // For doubles: playerC and playerD
  if (matchFormat === "doubles") {
    if (!data.playerC || typeof data.playerC !== "string") {
      errors.push("Player C ID is required for doubles matches");
    }
    if (!data.playerD || typeof data.playerD !== "string") {
      errors.push("Player D ID is required for doubles matches");
    }
  }

  // Duplicate player check
  const players = [data.playerA, data.playerB, data.playerC, data.playerD].filter((p) => p);
  if (new Set(players).size !== players.length) {
    errors.push("Players must be unique (no duplicates)");
  }

  // bestOf (optional, per-match override)
  if (data.bestOf !== undefined && data.bestOf !== null) {
    if (!Number.isInteger(data.bestOf)) {
      errors.push("Number of games must be an integer");
    } else if ((data.bestOf as number) < BADMINTON_MIN_BEST_OF || (data.bestOf as number) > BADMINTON_MAX_BEST_OF) {
      errors.push(`Number of games must be between ${BADMINTON_MIN_BEST_OF} and ${BADMINTON_MAX_BEST_OF}`);
    }
  }

  // pointsToWin (optional, per-match override)
  if (data.pointsToWin !== undefined && data.pointsToWin !== null) {
    if (!Number.isInteger(data.pointsToWin)) {
      errors.push("Points per game must be an integer");
    } else if (
      (data.pointsToWin as number) < BADMINTON_MIN_POINTS_TO_WIN ||
      (data.pointsToWin as number) > BADMINTON_MAX_POINTS_TO_WIN
    ) {
      errors.push(
        `Points per game must be between ${BADMINTON_MIN_POINTS_TO_WIN} and ${BADMINTON_MAX_POINTS_TO_WIN}`,
      );
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      courtId: data.courtId as string,
      format: matchFormat,
      playerA: data.playerA as string,
      playerB: data.playerB as string,
      playerC: data.playerC as string | undefined,
      playerD: data.playerD as string | undefined,
      bestOf: typeof data.bestOf === "number" ? (data.bestOf as number) : undefined,
      pointsToWin: typeof data.pointsToWin === "number" ? (data.pointsToWin as number) : undefined,
    },
  };
}

export interface AssignScorerInput {
  scorerId: string;
}

export function validateAssignScorerInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: AssignScorerInput;
} {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Input must be an object"] };
  }

  const data = input as Record<string, unknown>;

  if (!data.scorerId || typeof data.scorerId !== "string") {
    errors.push("Scorer ID is required and must be a string");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      scorerId: data.scorerId as string,
    },
  };
}
