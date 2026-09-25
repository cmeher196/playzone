import { getTournament, deleteTournament } from "./tournaments";

/**
 * One-time cleanup for the removed "CricArena Demo Cup" sample tournament.
 *
 * Earlier builds auto-seeded a read-only demo tournament (id `T-DEMO`) with
 * fabricated matches/scorecards so Rankings, Players, and Performance had
 * something to show before real scoring existed. Per product decision, all
 * placeholder data has been removed — those pages must be generated only
 * from real completed matches and tournaments. This removes any
 * previously-seeded demo tournament that might still be sitting in storage
 * (local JSON or MongoDB) from before this change; it is a no-op once gone.
 */
const DEMO_ID = "T-DEMO";

let cleanupPromise: Promise<void> | null = null;

export function removeDemoData(): Promise<void> {
  if (!cleanupPromise) {
    cleanupPromise = (async () => {
      const existing = await getTournament(DEMO_ID);
      if (existing) await deleteTournament(DEMO_ID);
    })().catch((error) => {
      cleanupPromise = null; // allow a retry after a transient failure
      throw error;
    });
  }
  return cleanupPromise;
}
