export type SportId = "cricket" | "badminton";

export interface SportModule {
  id: SportId;
  label: string;
  participantKinds: readonly ("individual" | "pair" | "team")[];
}

export const SPORTS: readonly SportModule[] = [
  { id: "cricket", label: "Cricket", participantKinds: ["team"] },
  { id: "badminton", label: "Badminton", participantKinds: ["individual", "pair"] },
];

export function getSport(id: string): SportModule | undefined {
  return SPORTS.find((sport) => sport.id === id);
}