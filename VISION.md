# CricArena — Vision & Product Idea

Reference app / north-star: [https://cricheroes.com/](https://cricheroes.com/)

**Goal:** Build a grassroots cricket platform like the app above.

## Idea (from the owner)
- **No payment scanner on the registration page** — registration is a simple sign-up for users.
- **Login** page + **reset password**.
- After login, a **left sidebar** with links: view profile, update profile, etc.
- Anyone who has registered can **create a tournament**, define the match dates, and set an entry fee.
- Interested & available players **join a tournament by paying the entry fee** using a UPI scanner.
- Each player can **see their own performance** for what they played here (like CricHeroes profiles).

## How it's implemented
### Registration (sign-up only)
Name, mobile (+ OTP), gender, age, playing role, password. No fee, no scanner.

### Accounts
Login with mobile + password. Forgot / reset password via OTP.

### Dashboard (after login)
Left sidebar: **Profile**, **Tournaments**, **My Performance**, **Log out**.

### Tournaments
- **Create:** name, description, venue, entry fee, and one or more match dates.
- **Browse** tournaments and open one to see details + who has joined.
- **Join:** scan the UPI QR to pay the entry fee, then submit the UTR / reference to confirm your spot.

### Performance
- Per-player view of tournaments joined and a stats summary (matches, runs, wickets, …).
- Detailed match stats fill in once live match scoring is added (next milestone).

## Roadmap
1. ✅ Sign-up, login, profile, photos
2. ✅ Tournaments: create, browse, join (entry-fee scanner)
3. ⏳ Match scheduling within a tournament
4. ⏳ Live ball-by-ball scoring + scorecards
5. ⏳ Player stats, leaderboards, rankings
6. ⏳ Real database + cloud photo storage
