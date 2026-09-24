// Shared "Scorer" role: a user who may score a match without being its
// owner/creator (match-level) or its organizer (tournament-level). Scorer
// permissions are intentionally narrow — see `canScoreLiveMatch` in
// live-matches.ts — they only unlock scoring-related actions, not full
// match/tournament management (reschedule, delete, edit details, etc).

export interface Scorer {
  userId: string;
  name: string;
  mobile: string;
  addedAt: string;
}

export function isScorer(scorers: Scorer[] | undefined, userId: string): boolean {
  return !!scorers?.some((s) => s.userId === userId);
}
