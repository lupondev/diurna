import { getFixturesByDate, getLiveMatches, getStandings, getHeadToHead as getH2H, type ApiFixture } from './api-football'

export type FixtureResponse = ApiFixture

export async function getTodayMatches(): Promise<{ response: FixtureResponse[] }> {
  const today = new Date().toISOString().slice(0, 10)
  const fixtures = await getFixturesByDate(today)
  return { response: fixtures }
}

export async function getLiveScores(leagueId?: number) {
  const matches = await getLiveMatches()
  if (leagueId) return matches.filter((m) => Number(m.id) === leagueId)
  return matches
}

export async function getLeagueStandings(leagueId: number, _season?: number) {
  return getStandings(leagueId)
}

export async function getHeadToHead(team1: number, team2: number, last = 10) {
  return getH2H(team1, team2, last)
}
