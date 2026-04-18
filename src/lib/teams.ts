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

// ---- Team metadata (for bracket display) -----------------------------------
// NBA-assigned team IDs are stable forever — they were assigned decades ago
// and never change. We use them to build logo URLs against NBA's official
// CDN, which serves crisp SVGs at any size.

export type Conference = "East" | "West";

export type TeamMeta = {
  tricode: string;        // "BOS", "LAL", etc. — for compact display & fallback logo
  nickname: string;       // "Celtics", "Lakers" — used in bracket cards (Sporting-News style)
  conference: Conference; // stable franchise-level assignment
  nbaId: string;          // NBA team ID used in cdn.nba.com logo URLs
};

export const TEAM_META: Record<NbaTeam, TeamMeta> = {
  "Atlanta Hawks":          { tricode: "ATL", nickname: "Hawks",        conference: "East", nbaId: "1610612737" },
  "Boston Celtics":         { tricode: "BOS", nickname: "Celtics",      conference: "East", nbaId: "1610612738" },
  "Brooklyn Nets":          { tricode: "BKN", nickname: "Nets",         conference: "East", nbaId: "1610612751" },
  "Charlotte Hornets":      { tricode: "CHA", nickname: "Hornets",      conference: "East", nbaId: "1610612766" },
  "Chicago Bulls":          { tricode: "CHI", nickname: "Bulls",        conference: "East", nbaId: "1610612741" },
  "Cleveland Cavaliers":    { tricode: "CLE", nickname: "Cavaliers",    conference: "East", nbaId: "1610612739" },
  "Dallas Mavericks":       { tricode: "DAL", nickname: "Mavericks",    conference: "West", nbaId: "1610612742" },
  "Denver Nuggets":         { tricode: "DEN", nickname: "Nuggets",      conference: "West", nbaId: "1610612743" },
  "Detroit Pistons":        { tricode: "DET", nickname: "Pistons",      conference: "East", nbaId: "1610612765" },
  "Golden State Warriors":  { tricode: "GSW", nickname: "Warriors",     conference: "West", nbaId: "1610612744" },
  "Houston Rockets":        { tricode: "HOU", nickname: "Rockets",      conference: "West", nbaId: "1610612745" },
  "Indiana Pacers":         { tricode: "IND", nickname: "Pacers",       conference: "East", nbaId: "1610612754" },
  "LA Clippers":            { tricode: "LAC", nickname: "Clippers",     conference: "West", nbaId: "1610612746" },
  "Los Angeles Lakers":     { tricode: "LAL", nickname: "Lakers",       conference: "West", nbaId: "1610612747" },
  "Memphis Grizzlies":      { tricode: "MEM", nickname: "Grizzlies",    conference: "West", nbaId: "1610612763" },
  "Miami Heat":             { tricode: "MIA", nickname: "Heat",         conference: "East", nbaId: "1610612748" },
  "Milwaukee Bucks":        { tricode: "MIL", nickname: "Bucks",        conference: "East", nbaId: "1610612749" },
  "Minnesota Timberwolves": { tricode: "MIN", nickname: "Timberwolves", conference: "West", nbaId: "1610612750" },
  "New Orleans Pelicans":   { tricode: "NOP", nickname: "Pelicans",     conference: "West", nbaId: "1610612740" },
  "New York Knicks":        { tricode: "NYK", nickname: "Knicks",       conference: "East", nbaId: "1610612752" },
  "Oklahoma City Thunder":  { tricode: "OKC", nickname: "Thunder",      conference: "West", nbaId: "1610612760" },
  "Orlando Magic":          { tricode: "ORL", nickname: "Magic",        conference: "East", nbaId: "1610612753" },
  "Philadelphia 76ers":     { tricode: "PHI", nickname: "76ers",        conference: "East", nbaId: "1610612755" },
  "Phoenix Suns":           { tricode: "PHX", nickname: "Suns",         conference: "West", nbaId: "1610612756" },
  "Portland Trail Blazers": { tricode: "POR", nickname: "Trail Blazers",conference: "West", nbaId: "1610612757" },
  "Sacramento Kings":       { tricode: "SAC", nickname: "Kings",        conference: "West", nbaId: "1610612758" },
  "San Antonio Spurs":      { tricode: "SAS", nickname: "Spurs",        conference: "West", nbaId: "1610612759" },
  "Toronto Raptors":        { tricode: "TOR", nickname: "Raptors",      conference: "East", nbaId: "1610612761" },
  "Utah Jazz":              { tricode: "UTA", nickname: "Jazz",         conference: "West", nbaId: "1610612762" },
  "Washington Wizards":     { tricode: "WAS", nickname: "Wizards",      conference: "East", nbaId: "1610612764" },
};

/**
 * Returns the NBA-official logo URL for a team, or null if the team name
 * isn't in our metadata map (should never happen in practice because
 * Series.teamA/teamB are constrained to NBA_TEAMS, but defensive code is
 * cheap).
 */
export function getTeamLogoUrl(team: string): string | null {
  const meta = TEAM_META[team as NbaTeam];
  if (!meta) return null;
  return `https://cdn.nba.com/logos/nba/${meta.nbaId}/primary/L/logo.svg`;
}

export function getTeamTricode(team: string): string {
  const meta = TEAM_META[team as NbaTeam];
  return meta?.tricode ?? team.slice(0, 3).toUpperCase();
}

export function getTeamNickname(team: string): string {
  const meta = TEAM_META[team as NbaTeam];
  if (meta) return meta.nickname;
  // Defensive fallback: last word of the string, e.g. "Some City Hawks" -> "Hawks".
  const parts = team.trim().split(/\s+/);
  return parts[parts.length - 1] ?? team;
}

export function getTeamConference(team: string): Conference | null {
  const meta = TEAM_META[team as NbaTeam];
  return meta?.conference ?? null;
}
