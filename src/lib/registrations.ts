import type { RegistrationInput } from "./validation";
import { appConfig } from "./config";
import { readStoredArray, writeStoredArray } from "./mongo";

export interface RegistrationRecord extends RegistrationInput {
  id: string;
  registeredAt: string;
  updatedAt?: string;
  role?: "admin" | "player";
  passwordHash?: string;
  photos?: string[];
}

/** Record with the password hash removed — safe to send to the client. */
export type PublicPlayer = Omit<RegistrationRecord, "passwordHash">;

export function toPublic(record: RegistrationRecord): PublicPlayer {
  const safe = { ...record };
  delete safe.passwordHash;
  return safe;
}

// Simple JSON-file storage to get started. Swap this module for a real database
// (Postgres, MongoDB, Supabase, etc.) later without touching the API route.
async function readAll(): Promise<RegistrationRecord[]> {
  return readStoredArray<RegistrationRecord>("registrations", "registrations.json");
}

async function writeAll(records: RegistrationRecord[]): Promise<void> {
  await writeStoredArray("registrations", "registrations.json", records);
}

export async function isMobileRegistered(mobile: string): Promise<boolean> {
  const records = await readAll();
  return records.some((record) => record.mobile === mobile);
}

export async function findById(
  id: string,
): Promise<RegistrationRecord | undefined> {
  const records = await readAll();
  return records.find((record) => record.id === id);
}

export async function findByMobile(
  mobile: string,
): Promise<RegistrationRecord | undefined> {
  const records = await readAll();
  return records.find((record) => record.mobile === mobile);
}

export async function updateRecord(
  id: string,
  patch: Partial<Omit<RegistrationRecord, "id" | "registeredAt">>,
): Promise<RegistrationRecord | undefined> {
  const records = await readAll();
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) return undefined;
  const updated: RegistrationRecord = {
    ...records[index],
    ...patch,
    id: records[index].id,
    registeredAt: records[index].registeredAt,
    updatedAt: new Date().toISOString(),
  };
  records[index] = updated;
  await writeAll(records);
  return updated;
}

export async function addRegistration(
  input: RegistrationInput & { passwordHash: string },
): Promise<RegistrationRecord> {
  const records = await readAll();
  const record: RegistrationRecord = {
    ...input,
    id: nextRegistrationId(records),
    registeredAt: new Date().toISOString(),
    photos: [],
  };
  records.push(record);
  await writeAll(records);
  return record;
}

// Sequential, human-friendly IDs: SMPL-A001 … SMPL-A999, then SMPL-B001 … up to
// SMPL-Z999 (25,974 total). Legacy IDs that don't match are ignored, so
// numbering starts fresh at A001.
const ID_PREFIX = appConfig.leagueName;
const SEQ_ID_RE = new RegExp(`^${ID_PREFIX}-([A-Z])(\\d{3})$`);

function ordinalFromId(id: string): number | null {
  const match = SEQ_ID_RE.exec(id);
  if (!match) return null;
  const letter = match[1].charCodeAt(0) - 65; // A -> 0
  return letter * 999 + Number(match[2]); // A001 -> 1
}

function nextRegistrationId(records: RegistrationRecord[]): string {
  const maxOrdinal = records.reduce((max, record) => {
    const ordinal = ordinalFromId(record.id);
    return ordinal && ordinal > max ? ordinal : max;
  }, 0);

  const n = maxOrdinal + 1;
  const letterIndex = Math.floor((n - 1) / 999);
  if (letterIndex > 25) {
    throw new Error("Registration ID capacity exhausted (SMPL-A001…SMPL-Z999).");
  }
  const number = ((n - 1) % 999) + 1;
  const letter = String.fromCharCode(65 + letterIndex);
  return `${ID_PREFIX}-${letter}${String(number).padStart(3, "0")}`;
}

/** All accounts, newest first, with password hashes stripped. */
export async function listPlayers(): Promise<PublicPlayer[]> {
  const records = await readAll();
  return records
    .slice()
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
    .map(toPublic);
}

/** Permanently removes an account. Returns false if the id wasn't found. */
export async function deleteRecord(id: string): Promise<boolean> {
  const records = await readAll();
  const next = records.filter((record) => record.id !== id);
  if (next.length === records.length) return false;
  await writeAll(next);
  return true;
}

/**
 * Ensures an admin account exists. A record matching the mobile is promoted to
 * admin (and given a password if it lacked one); otherwise a dedicated
 * SMPL-ADMIN account is created.
 */
export async function ensureAdminAccount(params: {
  mobile: string;
  name: string;
  passwordHash: string;
}): Promise<void> {
  const records = await readAll();
  const existing = records.find((record) => record.mobile === params.mobile);
  if (existing) {
    let changed = false;
    if (existing.role !== "admin") {
      existing.role = "admin";
      changed = true;
    }
    if (!existing.passwordHash) {
      existing.passwordHash = params.passwordHash;
      changed = true;
    }
    if (changed) {
      existing.updatedAt = new Date().toISOString();
      await writeAll(records);
    }
    return;
  }
  records.push({
    id: `${ID_PREFIX}-ADMIN`,
    name: params.name,
    mobile: params.mobile,
    gender: "Other",
    age: 30,
    playerType: "All-Rounder",
    role: "admin",
    passwordHash: params.passwordHash,
    registeredAt: new Date().toISOString(),
    photos: [],
  });
  await writeAll(records);
}
