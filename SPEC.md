# CricArena Application Specification

**Status:** Current implementation baseline  
**Date:** 2026-09-23  
**Repository:** `playzone`

## 1. Product Summary

CricArena is a grassroots sports platform for organizing cricket and badminton activities. It supports player accounts, tournaments, teams, match scheduling, live scoring, scorecards, rankings, performance views, and administration.

The application currently has two sports experiences:

- **Cricket:** registration, tournament management, teams, live cricket scoring, scorecards, rankings, and player performance.
- **Badminton:** tournament management, participants, match scheduling, live scoring, standings, rankings, and scorer assignment.

The application is implemented as a Next.js App Router application with React and TypeScript.

## 2. Current Product Decisions

- The landing page `/` is the login page.
- Users can continue as a guest from the login page.
- Player registration is available at `/register`.
- Authenticated users access a left-sidebar dashboard.
- The main cricket navigation includes Tournaments, Profile, Players, Teams, Matches, Rankings, and Performance.
- The Matches area supports live, upcoming, completed, tournament-backed, and standalone matches.
- Tournament-backed match creation reuses the existing tournament match flow.
- Standalone match creation allows custom teams and player names without a tournament.
- MongoDB is used when `MONGODB_URI` is configured; otherwise the application uses local JSON files.
- Uploaded files are stored under `public/uploads` during local development.

## 3. User Roles

### 3.1 Guest

Guests receive a signed session cookie with a synthetic guest identity. After guest entry, the guest lands directly on `/matches` and can browse the match list and match details.

Current guest capabilities:

- Open the application without registering.
- Browse authenticated pages that only require a session.
- View tournaments and matches where the page permits it.

Guest restrictions:

- Cannot create standalone matches.
- Cannot create tournaments or tournament-backed matches.
- Clicking any dashboard navigation item or changing sport sends the guest to the login landing page and preserves the requested destination.
- Choosing `Continue as guest` from that login landing page always returns to `/matches`; it never grants guest access to the requested protected destination.
- Guest write permissions should be reviewed for every future write endpoint. The session exists for exploration, but it is not a registered player account.

### 3.2 Player

A registered player signs in with a mobile number and password.

Player capabilities include:

- Manage their profile and photos.
- Browse tournaments.
- Join tournaments and submit payment references.
- Create teams where permitted.
- View matches involving their teams or tournaments they organize.
- View player profiles, rankings, and performance.

### 3.3 Tournament Organizer

Any registered player can create a tournament. The user who creates a tournament is its organizer. Any registered player can also create a match, including a match inside an existing tournament; the creating user becomes the match owner. Other users can view existing tournaments and matches, but cannot modify them. The organizer/owner can:

- Edit or delete the tournament according to the existing route authorization.
- Manage tournament participants.
- Create tournament-backed matches.
- Reschedule scheduled matches.
- Score, undo, and complete matches belonging to the tournament.
- Manage tournament teams and match setup.

### 3.4 Administrator

The administrator is a normal account with `role: "admin"`.

Administrators can:

- Access the admin dashboard.
- Manage users.
- View and manage all cricket matches.
- Manage tournament-backed and standalone matches.
- Use the normal login flow.

The admin account is seeded from environment values, with development defaults when values are absent.

## 4. Authentication and Account Flows

### 4.1 Login

Route: `/`

The landing page contains:

- Mobile number input.
- Password input.
- Sign-in action.
- Forgot-password flow.
- Continue as guest action.
- Link to player registration.

The login API validates the mobile/password pair, seeds the configured admin account, and creates an HTTP-only signed session cookie.

### 4.2 Registration

Route: `/register`

Registration collects:

- Name.
- Mobile number.
- Gender.
- Age.
- Playing role.
- Password.
- Payment and UTR fields where applicable to the existing registration flow.

The password is stored as an scrypt hash. Registration does not require OTP verification. A successful registration creates a session immediately.

### 4.3 Guest Login

Endpoint: `POST /api/auth/guest`

The endpoint creates a signed session for a synthetic guest user. No user record is written to JSON or MongoDB.

### 4.4 Password Reset

The reset flow uses OTP verification and allows the user to set a new password. The reset endpoint also signs the user in after a successful reset.

### 4.5 Session

Session characteristics:

- Cookie name: `cric_session`.
- HTTP-only cookie.
- SameSite `lax`.
- Secure in production.
- Thirty-day expiry.
- HMAC-signed payload.
- Secret source: `AUTH_SECRET`, then `OTP_SECRET`, then a development fallback.

## 5. Navigation and Pages

### 5.1 Shared Dashboard

Most authenticated pages use `DashboardShell`, which provides:

- Current sport selector.
- Application identity.
- User identity.
- Left navigation on desktop.
- Horizontal navigation on smaller screens.
- Theme switcher.
- Logout confirmation dialog.

### 5.2 Cricket Pages

| Route | Purpose |
|---|---|
| `/` | Login landing page |
| `/register` | Player registration |
| `/login` | Dedicated login page and reset-password entry |
| `/profile` | Current player profile |
| `/players` | Player directory |
| `/players/[id]` | Public/player detail view |
| `/tournaments` | Browse tournaments |
| `/tournaments/new` | Create a tournament |
| `/tournaments/[id]` | Tournament details, participants, teams, matches, standings |
| `/tournaments/[id]/matches/new` | Create a tournament-backed cricket match |
| `/tournaments/[id]/teams/new` | Create a team in a tournament |
| `/matches` | Live, upcoming, and completed cricket matches |
| `/matches/new` | Choose a tournament or create a standalone match |
| `/matches/[matchId]` | Match detail, live scoreboard, scorecard, squads, overs, progress, commentary, and info |
| `/teams/new` | Create a standalone team |
| `/teams/[teamId]` | Manage or inspect a team |
| `/rankings` | Cricket rankings |
| `/performance` | Current player performance |
| `/admin` | Administrator dashboard |
| `/join/cricket/[id]` | Public/invite cricket tournament join route |

### 5.3 Badminton Pages

| Route | Purpose |
|---|---|
| `/badminton` | Badminton overview |
| `/badminton/new` | Create a badminton tournament |
| `/badminton/tournaments` | Browse badminton tournaments |
| `/badminton/[id]` | Badminton tournament detail |
| `/badminton/[id]/control` | Tournament control room |
| `/badminton/[id]/live` | Live badminton tournament view |
| `/badminton/[id]/matches/[matchId]/score` | Badminton scoring screen |
| `/badminton/matches` | Badminton matches |
| `/badminton/matches/[matchId]` | Badminton match detail |
| `/badminton/players` | Badminton players |
| `/badminton/rankings` | Badminton rankings |
| `/badminton/scoring` | Badminton scoring desk |
| `/join/badminton/[id]` | Public/invite badminton tournament join route |

## 6. Cricket Tournament Workflow

1. A registered player creates a tournament.
2. The organizer defines the tournament name, description, venue, entry fee, and match dates.
3. Players browse the tournament.
4. A player opens the tournament and joins it.
5. If an entry fee applies, the player uses the configured UPI details and submits a UTR/reference value.
6. The organizer creates teams and adds players.
7. The organizer creates tournament-backed matches.
8. The organizer selects two teams, overs, date, venue, toss winner, and toss decision.
9. The match opens in scorer mode.
10. The scorer records ball-by-ball events.
11. The system derives scores, wickets, overs, batsman cards, bowler cards, extras, commentary, and result data from the event log.
12. The scorer completes the match.
13. Completed match data is added to the tournament scorecard history and feeds performance/ranking calculations where supported.

## 7. Matches

### 7.1 Matches Navigation

The cricket sidebar contains a `Matches` entry at `/matches`.

The Matches page shows all created matches to authenticated users and groups them into:

- **Live now:** matches with `status: "live"`.
- **Upcoming:** matches with `status: "scheduled"`, displayed with an `Upcoming` badge.
- **Past:** matches with `status: "completed"`, displayed with a `Past` badge.

Every authenticated user can view the full match list. The match creator or an administrator can open scorer mode; other users receive the live scoreboard and match details in view-only mode.

### 7.2 Tournament-Backed Match Creation

Route: `/tournaments/[id]/matches/new`

The existing form supports:

- Two team slots: Team A and Team B.
- Search and select existing tournament teams.
- Add a new team from the team picker.
- Search and select players from the selected team's squad.
- Add a registered player to the selected team.
- Add an unregistered player inline with their name and mobile number; the player is created as a passwordless account and added to the squad without replacing the current session.
- Choose captain, vice-captain, and wicketkeeper for each selected squad.
- Return to the team selection screen to choose Team B after completing Team A.
- Overs per side.
- Match date.
- Venue.
- Toss winner.
- Toss decision: bat or bowl.
- Virtual coin toss: the toss stays disabled until both teams have at least two players. The user then selects which team calls the toss, that team chooses Heads or Tails, the other team receives the opposite side, and clicking the coin runs an in-air animation before revealing the random result.

The form posts to `POST /api/tournaments/[id]/matches` and redirects to `/matches/[matchId]`.

### 7.3 Standalone Match Creation

Route: `/matches/new`

The page provides both:

- A list of tournaments managed by the current user.
- A direct standalone match form.

The standalone form supports:

- Custom Team A name.
- Custom Team B name.
- Comma-separated player names for each team.
- Overs per side.
- Date.
- Venue.
- Toss winner.
- Toss decision.

Endpoint: `POST /api/matches`

Standalone matches have no tournament ID and store the creating user as `ownerId`. They use the same `LiveMatch` structure and scorer as tournament-backed matches.

### 7.4 Match Actions

| Endpoint | Purpose |
|---|---|
| `GET /api/matches/[matchId]` | Fetch match and computed live state |
| `PATCH /api/matches/[matchId]` | Reschedule a scheduled match |
| `POST /api/matches/[matchId]/events` | Add a scoring event |
| `POST /api/matches/[matchId]/undo` | Undo the latest scoring event |
| `POST /api/matches/[matchId]/complete` | Complete a ready match |

For standalone matches, the owner or an administrator can perform scoring and match management actions. For tournament matches, the tournament organizer or an administrator can perform them.

## 8. Cricket Scoring Model

The scoring engine uses immutable-style event replay semantics:

- Delivery events are the source of truth.
- Scoreboard values are computed from the event history.
- Undo removes the latest event and recomputes the state.
- A match starts with the first innings.
- Ending the first innings creates the second innings with batting and bowling sides swapped.
- A scheduled match becomes live after the first scoring event.
- A match becomes complete only when the scoring engine reports it is ready.

Supported event concepts include:

- Legal runs.
- Wides.
- No-balls.
- Byes.
- Leg-byes.
- Wickets.
- Opening batters.
- New batter selection.
- Bowler selection.
- Innings end.

The scoreboard exposes:

- Live score.
- Scorecard.
- Squads.
- Overs.
- Progress.
- Commentary.
- Match info.

## 9. Teams

Teams may be associated with one or more tournaments. A team contains:

- Team ID.
- Name.
- Owner.
- Logo.
- Captain and vice-captain where configured.
- Player membership.
- Creation timestamp.
- Tournament associations.

Team management supports adding and removing players, team updates, and logo uploads subject to existing authorization.

## 10. Player Profiles and Performance

Player profile capabilities include:

- View profile information.
- Update personal and playing details.
- Change password.
- Upload and delete profile photos.
- View performance summaries.
- View rankings and player detail pages.

Performance and ranking data is derived from stored tournament and match records. Live score completion is the point at which detailed match statistics become available to downstream views.

## 11. Badminton

Badminton is implemented as a separate sport experience with its own domain modules and UI.

Supported capabilities include:

- Create badminton tournaments.
- Add participants.
- Create badminton matches.
- Generate random schedules.
- Assign scorers.
- Score live matches.
- View live match state.
- Manage tournament control-room operations.
- View standings and rankings.
- View badminton players and matches.

Badminton match and tournament APIs are under `/api/badminton` and use badminton-specific validation and scoring logic.

## 12. Administrator Features

The admin area supports user administration:

- List users.
- Update user details and roles where allowed.
- Delete users.
- Promote or maintain administrator access through the configured admin account.

Admin authorization is based on the authenticated user's `role: "admin"`.

## 13. API Surface

### Authentication and Accounts

- `POST /api/auth/login`
- `POST /api/auth/guest`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`
- `POST /api/auth/reset-password`
- `POST /api/register`
- `POST /api/otp/send`
- `POST /api/otp/verify`
- `GET /api/profile`
- `PATCH /api/profile`
- `POST /api/profile/photos`
- `DELETE /api/profile/photos`

### Cricket Tournaments and Teams

- `GET|POST /api/tournaments`
- `GET|PATCH|DELETE /api/tournaments/[id]`
- `POST /api/tournaments/[id]/join`
- `POST|DELETE /api/tournaments/[id]/participants`
- `GET|POST /api/tournaments/[id]/teams`
- `GET|POST /api/tournaments/[id]/matches`
- `GET|POST /api/teams`
- `GET|PATCH|DELETE /api/teams/[teamId]`
- `POST|DELETE /api/teams/[teamId]/players`
- `DELETE /api/teams/[teamId]/players/[playerId]`
- `POST /api/teams/[teamId]/logo`

### Cricket Matches

- `POST /api/matches`
- `GET|PATCH /api/matches/[matchId]`
- `POST /api/matches/[matchId]/events`
- `POST /api/matches/[matchId]/undo`
- `POST /api/matches/[matchId]/complete`

### Badminton

- `GET|POST /api/badminton`
- `GET|POST /api/badminton/tournaments`
- `GET|PATCH|DELETE /api/badminton/tournaments/[id]`
- `POST /api/badminton/tournaments/[id]/join`
- `GET|POST /api/badminton/tournaments/[id]/matches`
- `PATCH|DELETE /api/badminton/tournaments/[id]/matches/[matchId]`
- `POST /api/badminton/tournaments/[id]/matches/[matchId]/score`
- `PATCH|DELETE /api/badminton/tournaments/[id]/matches/[matchId]/scorer`
- `POST /api/badminton/tournaments/[id]/schedule`

### Administration

- `PATCH|DELETE /api/admin/users/[id]`

## 14. Data Storage

### 14.1 Storage Selection

The storage adapter checks `MONGODB_URI`:

- If configured, records are read from MongoDB.
- If absent, records are read from JSON files in `data/`.

The database name defaults to `cricarena` and can be overridden by `MONGODB_DB`.

### 14.2 Local JSON Files

The local development data model includes files such as:

- `data/registrations.json`
- `data/tournaments.json`
- `data/teams.json`
- `data/live-matches.json`
- Additional sport-specific data files created by the application.

The `data/` directory is ignored by Git.

### 14.3 MongoDB Migration

The migration command is:

```bash
npm run migrate:mongo
```

It loads environment variables from `.env.local` when present and migrates the existing JSON data into MongoDB.

### 14.4 File Uploads

Local profile and team uploads use `public/uploads`. This storage is not persistent on typical serverless deployments and should be replaced by object storage before production reliance.

## 15. Environment Configuration

Primary environment variables:

```env
MONGODB_URI=
MONGODB_DB=cricarena
AUTH_SECRET=
OTP_SECRET=
ADMIN_MOBILE=
ADMIN_PASSWORD=
ADMIN_NAME=
NEXT_PUBLIC_LEAGUE_NAME=SMPL
NEXT_PUBLIC_LEAGUE_FULL_NAME=SMPL Cricket League
NEXT_PUBLIC_REG_FEE=500
NEXT_PUBLIC_UPI_ID=
NEXT_PUBLIC_UPI_PAYEE_NAME=SMPL Cricket League
```

Development behavior:

- Without `MONGODB_URI`, local JSON storage is used.
- Without admin variables, development admin defaults are used by the current implementation.
- Without `AUTH_SECRET` or `OTP_SECRET`, a development fallback secret is used. A production deployment must set a strong secret.

## 16. Commands

```bash
npm install
npm run dev
npm run dev:lan
npm run lint
npm run build
npm start
npm run migrate:mongo
```

Use `npm run dev` for local development. Use `npm run build && npm start` for a production-mode local run.

## 17. Non-Functional Requirements

### Security

- Passwords must never be stored in plaintext.
- Session cookies must remain HTTP-only.
- Production deployments must provide strong auth and OTP secrets.
- API authorization must be enforced server-side, not only in UI controls.
- Guest access must not grant player or organizer privileges.
- Upload validation and storage must be hardened before production.

### Reliability

- Scoring updates must preserve event ordering.
- Match completion must be idempotent or reject already-completed matches safely.
- MongoDB connection failures should return actionable server errors.
- Local JSON fallback must not be unintentionally enabled in production.

### Usability

- Match status must be visible at a glance.
- Live matches must link directly to the live scoring view.
- Upcoming and completed matches must remain discoverable from the Matches navigation.
- Forms must report validation errors close to the affected action.
- Mobile layouts must support dashboard navigation and scoring workflows.

## 18. Known Gaps and Recommended Next Work

1. Add automated end-to-end tests for login, guest access, tournament creation, standalone match creation, and scoring.
2. Add explicit route-level guest restrictions to all write APIs.
3. Add a formal shared schema for standalone match creation instead of manual request validation.
4. Add match visibility rules for standalone matches so participants can discover them without relying only on the creator's match list.
5. Add persistent cloud object storage for profile and team photos.
6. Add production safeguards that require `MONGODB_URI`, `AUTH_SECRET`, and `OTP_SECRET` outside local development.
7. Remove or resolve existing repository lint errors in unrelated components.
8. Add audit history for administrative changes and match scoring actions.
9. Add pagination and filtering for large player, tournament, and match collections.
10. Expand ranking and performance calculations with verified completed-match test fixtures.
11. Add notifications for tournament joins, match scheduling, scorer assignment, and match completion.
12. Document the badminton data model and scoring rules in the same depth as cricket.

## 19. Acceptance Criteria for the Current Build

The current build is considered functionally aligned when:

- `/` presents login and guest access.
- `/register` creates a player account after OTP verification.
- A registered user can create and browse tournaments.
- A player can join a tournament and submit the required payment reference.
- A tournament organizer can create teams and tournament matches.
- A user can open Matches and distinguish live, upcoming, and completed matches.
- A registered user can create a standalone match from `/matches/new`.
- A standalone match opens the same scorer used for tournament matches.
- Match events, undo, rescheduling, and completion work through server-side authorization.
- Badminton tournament, scheduling, scoring, and standings routes remain available.
- The application can run locally with JSON storage or with MongoDB configured through `.env.local`.
