# Coffer: Product Spec

A gamified personal expense tracker.

## Goal

Coffer is built around two goals, in this order:

1. **Logging is fast.** Recording an expense takes under 5 seconds and 3 taps.
2. **Users come back.** The app should make someone want to open it again tomorrow.

Every other decision is judged against these two.

## Audience and platform

- **Users:** the owner, for real personal budgeting, and visitors (such as
  recruiters) trying the app through a demo mode.
- **Platform:** a web app, designed mobile-first. Large tap targets and
  thumb-reachable controls, while still usable on a laptop.
- **Hosting:** deployed to the cloud and redeployed automatically on every push.
- **Currency and locale:** configurable, defaulting to MYR and
  Asia/Kuala_Lumpur.

## Requirements

1. **Cloud database.** Data is stored in PostgreSQL (Neon or Supabase). The
   repo includes the schema and setup instructions.
2. **Login and demo mode.** The owner signs in securely. The login screen also
   has a **Try the demo** button that opens an isolated account filled with
   realistic sample data, so visitors can explore without touching real data.
3. **Easy deployment.** The project deploys to a cloud host with no manual
   steps beyond setting environment variables, and the README explains how.
4. **Feels instant.** Saving never waits on the server. The UI updates
   optimistically and syncs in the background.

## Data

Each expense records:

| Field | Notes |
|---|---|
| `id` | Primary key |
| `date` | Defaults to today |
| `category` | One of the preset categories, or `custom` |
| `custom_label` | Free text, only for custom expenses |
| `subtype` | Optional. Food is split into `delivery` and `cooked` |
| `amount` | Decimal, 2 places |
| `note` | Optional free text |
| `created_at` | Timestamp, used for streaks |

**Preset categories:** Transport, Food, Groceries, Rent, WiFi, Water, Electric,
and Other (custom label).

The app also stores user settings (monthly budget, currency), XP, streak state
and unlocked badges.

**Recurring bills** (rent, WiFi, water, electric) can be saved as templates and
logged with one tap, since the amount is usually the same each month. Last
month's amount is pre-filled and can be edited before saving.

## Screens

### 1. Quick Add (home, about 90% of use)

- A date selector, set to today, with a one-tap **Yesterday** option and a date
  picker for older days.
- A grid of large category tiles. Food expands inline into Delivery and Cooked.
  **Other** opens a field for a custom label.
- A numeric keypad with large digits, a clear Save button, and an optional note
  field that stays collapsed until needed.
- **Remembered amounts.** After choosing a category, the app suggests up to 3
  recent amounts as chips. Tapping a chip **fills the keypad but does not
  save**, so the amount can be adjusted first. A wrong amount saved is worse
  than one extra tap.
  - Stable categories (Transport, Rent, WiFi, Water, Electric, Groceries,
    Food → Cooked) show the full row of chips, because their amounts repeat.
  - **Food → Delivery** shows a single chip marked `~` (approximate). Delivery
    totals change every order with fees and promos, so the last amount is only
    a starting point.
- After saving, feedback appears and the form resets, ready for the next
  entry. No navigating back.

### 2. Dashboard

- The remaining budget is the main visual (see Gamification).
- Today's entries, each editable and deletable.
- A breakdown of this month's spending by category.

### 3. History

- Filter by month and category, with running totals.

### 4. Export

- Download as `.xlsx` or `.csv`.
- The Excel file has one sheet per month plus a **Summary** sheet with
  category totals per month. Columns: Date, Category, Subtype, Custom Label,
  Amount, Note. The header row is frozen, amounts are formatted as currency,
  and columns are sized to fit.
- Exports always come from live data, never a cached copy.

## Gamification

The principle is **encouragement, never punishment.**

- **XP for logging, not for spending less.** +10 XP per entry, +25 for the
  first entry of the day or for marking a no-spend day, +50 per completed quest
  and +40 per badge. Users are rewarded for being honest, so there's never a
  reason to hide a purchase.
- **Streaks** count consecutive days with at least one entry, or a tap on
  **No spending today**. One **streak freeze** per month covers a missed day
  automatically, so a single slip doesn't wipe out a long streak.
- **Levels** based on total XP, with a progress bar that animates on every gain.
- **Budget as a resource bar.** Remaining budget drains like a health or fuel
  gauge. Going over is shown calmly ("over by X, resets next month"), never as
  a red alarm.
- **Weekly quests,** 2–3 at a time, based on the user's own habits. For
  example: "Log on 5 days this week" or "Cook 3 meals instead of ordering".
  Completing one earns XP.
- **Badges** for milestones: first entry, 7-day and 30-day streaks, first month
  fully logged, first month under budget, 100 entries.

**Deliberately left out:** losing XP for overspending, guilt-tripping copy,
alarming red UI, nagging notifications, leaderboards, and anything that
punishes a missed day.

## Feedback after saving

- Feedback appears **within 300 ms** of tapping Save.
- A toast shows the amount, XP earned, and a short encouraging message.
- The toast has an **Undo** button for about 5 seconds. Undo removes the entry
  and reverses any XP, streak or badge change, as if it never happened. Undoing
  does not count as activity for the streak.
- Messages rotate through a pool of 20+ lines so they don't repeat. The tone is
  warm, brief and a little playful, for example "Logged. That's 6 days
  running."
- Milestones (level up, new badge, every 7-day streak) get a bigger celebration
  that lasts under 2 seconds and can be dismissed.
- Optional haptics and sound, both off by default.
- Animations respect the device's reduced-motion setting.

## Acceptance criteria

1. A fresh clone runs with one install step and one command.
2. A Transport expense for today can be logged in 3 taps, typing only the
   amount.
3. An expense outside the preset categories can be logged with a custom label.
4. Entries can be edited and deleted.
5. Saving and then undoing leaves the data, XP and streak exactly as before.
6. Choosing Transport shows recent amounts as chips. Tapping one fills the
   keypad without saving. Food → Delivery shows a single `~` chip instead.
7. All data, XP, streaks and badges survive a server restart.
8. The `.xlsx` export opens correctly in Excel, LibreOffice and Google Sheets,
   with correct totals.
9. Streaks roll over correctly at midnight, and the freeze covers exactly one
   missed day per month.
10. The app is usable one-handed on a 390px-wide phone screen.

## Build plan

Each phase works end to end before the next begins:

1. **Core:** data layer, quick add, list view, edit and delete.
2. **Export:** CSV and Excel.
3. **Game layer:** XP, streaks, levels, badges, quests.
4. **Polish:** animation, feedback messages, visual design.

The gamification numbers (XP values, level thresholds, streak rules) are
commented in the code so they can be tuned later.

## Open questions

Answered in [DECISIONS.md](DECISIONS.md):

1. What's the right stack: a lightweight local setup, or a hosted database?
2. Should recurring bills log themselves automatically, or always need a tap
   to confirm?
3. What's the most likely reason someone stops using the app in week three,
   and what one feature would prevent it?
