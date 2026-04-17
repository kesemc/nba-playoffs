import { z } from "zod";
import { NBA_TEAM_SET, ROUNDS, VALID_GAMES } from "@/lib/teams";

const team = z
  .string()
  .refine((s) => NBA_TEAM_SET.has(s), { message: "Unknown NBA team" });

const round = z.enum(ROUNDS);

const games = z
  .number()
  .int()
  .refine((n) => (VALID_GAMES as readonly number[]).includes(n), {
    message: "games must be 4, 5, 6, or 7",
  });

const oddsValue = z
  .number()
  .finite()
  .gt(1, "Odds must be greater than 1.0");

/**
 * Odds grid for a series — only the 2 winner-to-win-series values.
 *
 * The scoring rule is: winner_odds (wrong games) or winner_odds + flat bonus
 * (exact games), so exact-score odds are not needed for the payout. Admins
 * just enter bet365's "team to win series" decimal odds for each side.
 */
export const OddsGrid = z.object({
  winnerA: oddsValue,
  winnerB: oddsValue,
});
export type OddsGrid = z.infer<typeof OddsGrid>;

export const CreateSeriesInput = z
  .object({
    round,
    teamA: team,
    teamB: team,
    // ISO-8601 string from the form's datetime-local input
    lockTime: z.coerce.date(),
    odds: OddsGrid,
  })
  .refine((v) => v.teamA !== v.teamB, {
    message: "teamA and teamB must differ",
    path: ["teamB"],
  })
  .refine((v) => v.lockTime.getTime() > Date.now(), {
    message: "lockTime must be in the future",
    path: ["lockTime"],
  });
export type CreateSeriesInput = z.infer<typeof CreateSeriesInput>;

export const UpdateSeriesInput = z.object({
  seriesId: z.string().min(1),
  odds: OddsGrid,
  // Optional on edit: only provided when the admin chose to change the lock.
  // We intentionally allow past values so admins can correct a bad lockTime
  // even after tipoff (e.g. timezone mistake).
  lockTime: z.coerce.date().optional(),
});

export const EnterResultInput = z.object({
  seriesId: z.string().min(1),
  winner: team,
  games,
});

export const SubmitPickInput = z.object({
  seriesId: z.string().min(1),
  pickedTeam: team,
  pickedGames: games,
});

export const PromoteUserInput = z.object({
  userId: z.string().min(1),
  isAdmin: z.boolean(),
});
