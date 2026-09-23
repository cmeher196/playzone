/**
 * App-wide configuration.
 *
 * The NEXT_PUBLIC_* values are safe to expose to the browser (they are not
 * secrets) so the UPI payment QR can be generated on the client. Change them in
 * `.env.local` — no code edits required.
 */
export const appConfig = {
  appName: "CricArena",
  tagline: "Your Ground. Your Game.",
  leagueName: process.env.NEXT_PUBLIC_LEAGUE_NAME ?? "SMPL",
  leagueFullName: process.env.NEXT_PUBLIC_LEAGUE_FULL_NAME ?? "SMPL Cricket League",
  currencySymbol: "₹",
  registrationFee: Number(process.env.NEXT_PUBLIC_REG_FEE ?? 300),
  upi: {
    id: process.env.NEXT_PUBLIC_UPI_ID ?? "your-vpa@bank",
    payeeName: process.env.NEXT_PUBLIC_UPI_PAYEE_NAME ?? "SMPL Cricket League",
  },
} as const;
