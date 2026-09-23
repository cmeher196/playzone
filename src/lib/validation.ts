import { z } from "zod";

export const PLAYER_TYPES = [
  "Batsman",
  "Bowler",
  "All-Rounder",
  "Wicket-Keeper",
] as const;

export const GENDERS = ["Male", "Female", "Other"] as const;

export type PlayerType = (typeof PLAYER_TYPES)[number];
export type Gender = (typeof GENDERS)[number];

const mobileField = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

const passwordField = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(72, "Password is too long");

export const registrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your full name")
    .max(60, "Name is too long"),
  mobile: mobileField,
  gender: z.enum(GENDERS, { error: "Select your gender" }),
  age: z
    .number({ error: "Please enter your age (8–70)" })
    .min(8, "Age must be between 8 and 70")
    .max(70, "Age must be between 8 and 70"),
  playerType: z.enum(PLAYER_TYPES, { error: "Select your playing role" }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

// Client registration form: all persisted fields plus the chosen password.
export const registrationFormSchema = registrationSchema.extend({
  password: passwordField,
});

export type RegistrationFormInput = z.infer<typeof registrationFormSchema>;

// Payload accepted by the register API: form fields, password, and the OTP
// token proving the mobile was verified. Password is hashed and the token
// dropped before the record is persisted (see the register route).
export const registrationApiSchema = registrationSchema.extend({
  password: passwordField,
  verificationToken: z.string().min(1, "Please verify your mobile number"),
});

export type RegistrationApiInput = z.infer<typeof registrationApiSchema>;

export const loginSchema = z.object({
  mobile: mobileField,
  password: z.string().min(1, "Enter your password"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Profile edit. Changing the mobile number requires a fresh OTP token.
export const profileUpdateSchema = registrationSchema
  .pick({ name: true, gender: true, age: true, playerType: true, mobile: true })
  .extend({ verificationToken: z.string().optional() });

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const ACCOUNT_ROLES = ["player", "admin"] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

// Admin editing another account. All fields optional; only provided keys change.
export const adminUserUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name is too short")
    .max(60, "Name is too long")
    .optional(),
  gender: z.enum(GENDERS).optional(),
  age: z
    .number()
    .min(8, "Age must be between 8 and 70")
    .max(70, "Age must be between 8 and 70")
    .optional(),
  playerType: z.enum(PLAYER_TYPES).optional(),
  role: z.enum(ACCOUNT_ROLES).optional(),
});
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;

// Set or reset a password after verifying the mobile via OTP.
export const passwordResetSchema = z.object({
  mobile: mobileField,
  verificationToken: z.string().min(1, "Please verify your mobile number"),
  password: passwordField,
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

// Change password while signed in. currentPassword is verified server-side
// (optional only for legacy accounts that never set one).
export const passwordChangeSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: passwordField,
});

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

// A UPI transaction / UTR reference, entered after paying via the scanner.
const utrField = z
  .string()
  .trim()
  .min(6, "Enter the UPI transaction / UTR ID after paying")
  .max(40, "Transaction ID is too long");

export const tournamentCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Give your tournament a name")
    .max(80, "Name is too long"),
  description: z.string().trim().max(500, "Description is too long").optional(),
  venue: z.string().trim().max(120, "Venue is too long").optional(),
  entryFee: z
    .number({ error: "Enter the entry fee" })
    .min(0, "Fee can't be negative")
    .max(100000, "Fee is too high"),
  matchDates: z
    .array(z.string().trim().min(1))
    .min(1, "Add at least one match date")
    .max(30, "Too many dates"),
});

export type TournamentCreateInput = z.infer<typeof tournamentCreateSchema>;

export const tournamentUpdateSchema = tournamentCreateSchema.partial();
export type TournamentUpdateInput = z.infer<typeof tournamentUpdateSchema>;

export const BADMINTON_EVENT_TYPES = [
  "mens-singles",
  "womens-singles",
  "mens-doubles",
  "womens-doubles",
  "mixed-doubles",
] as const;
export type BadmintonEventType = (typeof BADMINTON_EVENT_TYPES)[number];

export const badmintonTournamentCreateSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(500).optional(),
  location: z.string().trim().max(120).optional(),
  venue: z.string().trim().max(120).optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  registrationDeadline: z.string().min(1),
  contact: z.string().trim().max(120).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  format: z.enum(["knockout", "round-robin", "group-knockout"]),
  eventTypes: z.array(z.enum(BADMINTON_EVENT_TYPES)).min(1),
});
export type BadmintonTournamentCreateInput = z.infer<typeof badmintonTournamentCreateSchema>;

export const tournamentJoinSchema = z.object({
  transactionId: utrField.optional(),
});

export type TournamentJoinInput = z.infer<typeof tournamentJoinSchema>;

export const teamCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Team name is too short")
    .max(40, "Team name is too long"),
  logo: z.string().trim().max(8, "Use a short emoji or initials").optional(),
  sourceTeamId: z.string().optional(),
});
export type TeamCreateInput = z.infer<typeof teamCreateSchema>;

export const teamUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Team name is too short")
    .max(40, "Team name is too long")
    .optional(),
  logo: z
    .string()
    .trim()
    .refine(
      (value) => value.length <= 8 || value.startsWith("/uploads/teams/"),
      "Use a short emoji, initials, or upload a team photo",
    )
    .optional(),
  captainId: z.string().optional(),
  viceCaptainId: z.string().optional(),
});
export type TeamUpdateInput = z.infer<typeof teamUpdateSchema>;

export const teamAddPlayerSchema = z.object({
  playerId: z.string().min(1, "Select a player"),
  playerNumber: z
    .string()
    .regex(/^\d{1,3}$/, "Jersey number must contain 1 to 3 digits"),
});
export type TeamAddPlayerInput = z.infer<typeof teamAddPlayerSchema>;

export const addParticipantsSchema = z.object({
  playerIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one player")
    .max(200, "Too many players at once"),
});
export type AddParticipantsInput = z.infer<typeof addParticipantsSchema>;

export const matchCreateSchema = z
  .object({
    teamAId: z.string().min(1, "Select the first team"),
    teamBId: z.string().min(1, "Select the second team"),
    overs: z
      .number({ error: "Enter overs per side" })
      .int()
      .min(1, "At least 1 over")
      .max(50, "Max 50 overs"),
    venue: z.string().trim().max(120, "Venue is too long").optional(),
    date: z.string().min(1, "Pick a date"),
    tossWinnerId: z.string().min(1, "Select the toss winner"),
    tossDecision: z.enum(["bat", "bowl"], { error: "Choose bat or bowl" }),
  })
  .refine((d) => d.teamAId !== d.teamBId, {
    error: "Pick two different teams",
    path: ["teamBId"],
  });
export type MatchCreateInput = z.infer<typeof matchCreateSchema>;

export const scoreEventSchema = z.discriminatedUnion("t", [
  z.object({
    t: z.literal("openers"),
    strikerId: z.string().min(1),
    nonStrikerId: z.string().min(1),
  }),
  z.object({ t: z.literal("bowler"), bowlerId: z.string().min(1) }),
  z.object({ t: z.literal("newBatter"), batterId: z.string().min(1) }),
  z.object({ t: z.literal("endInnings") }),
  z.object({
    t: z.literal("ball"),
    runs: z.number().int().min(0).max(7),
    extraType: z.enum(["wide", "no-ball", "bye", "leg-bye"]).optional(),
    extraRuns: z.number().int().min(0).max(7).optional(),
    wicket: z
      .object({
        type: z.enum([
          "bowled",
          "caught",
          "lbw",
          "run-out",
          "stumped",
          "hit-wicket",
        ]),
        dismissedId: z.string().min(1),
        fielderId: z.string().optional(),
      })
      .optional(),
  }),
]);
export type ScoreEventInput = z.infer<typeof scoreEventSchema>;
