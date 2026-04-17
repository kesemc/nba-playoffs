// Canonical NBA team list. Used as the set of valid values for
// Series.teamA / Series.teamB / Pick.pickedTeam / SeriesResult.winner.

export const NBA_TEAMS = [
  "Atlanta Hawks",
  "Boston Celtics",
  "Brooklyn Nets",
  "Charlotte Hornets",
  "Chicago Bulls",
  "Cleveland Cavaliers",
  "Dallas Mavericks",
  "Denver Nuggets",
  "Detroit Pistons",
  "Golden State Warriors",
  "Houston Rockets",
  "Indiana Pacers",
  "LA Clippers",
  "Los Angeles Lakers",
  "Memphis Grizzlies",
  "Miami Heat",
  "Milwaukee Bucks",
  "Minnesota Timberwolves",
  "New Orleans Pelicans",
  "New York Knicks",
  "Oklahoma City Thunder",
  "Orlando Magic",
  "Philadelphia 76ers",
  "Phoenix Suns",
  "Portland Trail Blazers",
  "Sacramento Kings",
  "San Antonio Spurs",
  "Toronto Raptors",
  "Utah Jazz",
  "Washington Wizards",
] as const;

export type NbaTeam = (typeof NBA_TEAMS)[number];

export const NBA_TEAM_SET: ReadonlySet<string> = new Set(NBA_TEAMS);

export const ROUNDS = ["R1", "R2", "CF", "F"] as const;
export type Round = (typeof ROUNDS)[number];

export const ROUND_LABELS: Record<Round, string> = {
  R1: "First Round",
  R2: "Conference Semifinals",
  CF: "Conference Finals",
  F: "NBA Finals",
};

export const VALID_GAMES = [4, 5, 6, 7] as const;
