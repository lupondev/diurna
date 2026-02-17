import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_FEEDS = [
  { name: 'BBC Sport Football', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', tier: 1, category: 'breaking', country: 'UK' },
  { name: 'Sky Sports Football', url: 'https://www.skysports.com/rss/12040', tier: 1, category: 'breaking', country: 'UK' },
  { name: 'ESPN FC', url: 'https://www.espn.com/espn/rss/soccer/news', tier: 1, category: 'breaking', country: 'US' },
  { name: 'Goal.com', url: 'https://www.goal.com/feeds/en/news', tier: 1, category: 'breaking', country: 'global' },
  { name: 'Football365', url: 'https://www.football365.com/feed', tier: 1, category: 'breaking', country: 'UK' },
  { name: '101 Great Goals', url: 'https://www.101greatgoals.com/feed/', tier: 1, category: 'breaking', country: 'UK' },
  { name: 'TalkSport Football', url: 'https://talksport.com/football/rss', tier: 1, category: 'breaking', country: 'UK' },
  { name: '90min', url: 'https://www.90min.com/posts.rss', tier: 1, category: 'breaking', country: 'global' },
  { name: 'The Guardian Football', url: 'https://www.theguardian.com/football/rss', tier: 1, category: 'breaking', country: 'UK' },
  { name: 'Mirror Football', url: 'https://www.mirror.co.uk/sport/football/rss.xml', tier: 1, category: 'breaking', country: 'UK' },

  { name: 'Marca Football', url: 'https://e00-marca.uecdn.es/rss/en/football.xml', tier: 2, category: 'breaking', country: 'ES' },
  { name: 'AS English Football', url: 'https://en.as.com/rss/en/football.xml', tier: 2, category: 'breaking', country: 'ES' },
  { name: 'Kicker', url: 'https://rss.kicker.de/news/aktuell', tier: 2, category: 'breaking', country: 'DE' },
  { name: 'Gazzetta dello Sport', url: 'https://www.gazzetta.it/rss/calcio.xml', tier: 2, category: 'breaking', country: 'IT' },
  { name: "L'Equipe Football", url: 'https://www.lequipe.fr/rss/actu_rss_Football.xml', tier: 2, category: 'breaking', country: 'FR' },
  { name: 'Foot Mercato', url: 'https://www.footmercato.net/feed', tier: 2, category: 'transfer', country: 'FR' },
  { name: 'Sky Sports Transfers', url: 'https://www.skysports.com/rss/12691', tier: 2, category: 'transfer', country: 'UK' },
  { name: 'FootballTransfers', url: 'https://www.footballtransfers.com/en/rss', tier: 2, category: 'transfer', country: 'global' },
  { name: 'TalkSport Transfers', url: 'https://talksport.com/football/transfers/rss', tier: 2, category: 'transfer', country: 'UK' },
  { name: 'FourFourTwo', url: 'https://www.fourfourtwo.com/feed', tier: 2, category: 'analysis', country: 'UK' },
  { name: 'Planet Football', url: 'https://www.planetfootball.com/feed/', tier: 2, category: 'analysis', country: 'UK' },
  { name: 'SoccerNews', url: 'https://www.soccernews.com/feed/', tier: 2, category: 'breaking', country: 'global' },
  { name: 'Tribal Football', url: 'https://www.tribalfootball.com/rss.xml', tier: 2, category: 'transfer', country: 'UK' },
  { name: 'Football Italia', url: 'https://www.football-italia.net/feed', tier: 2, category: 'breaking', country: 'IT' },
  { name: 'BeSoccer', url: 'https://www.besoccer.com/feed', tier: 2, category: 'breaking', country: 'global' },

  { name: 'Arsenal News', url: 'https://www.arsenal.com/rss.xml', tier: 3, category: 'club', country: 'UK' },
  { name: 'Chelsea News', url: 'https://www.chelseafc.com/en/rss.xml', tier: 3, category: 'club', country: 'UK' },
  { name: 'Liverpool News', url: 'https://www.liverpoolfc.com/rss', tier: 3, category: 'club', country: 'UK' },
  { name: 'Man United News', url: 'https://www.manutd.com/rss/newsandfeatures', tier: 3, category: 'club', country: 'UK' },
  { name: 'Man City News', url: 'https://www.mancity.com/rss', tier: 3, category: 'club', country: 'UK' },
  { name: 'Tottenham News', url: 'https://www.tottenhamhotspur.com/rss', tier: 3, category: 'club', country: 'UK' },
  { name: 'FC Barcelona', url: 'https://www.fcbarcelona.com/rss/en', tier: 3, category: 'club', country: 'ES' },
  { name: 'Real Madrid', url: 'https://www.realmadrid.com/rss/en', tier: 3, category: 'club', country: 'ES' },
  { name: 'Bayern Munich', url: 'https://fcbayern.com/en/rss', tier: 3, category: 'club', country: 'DE' },
  { name: 'Juventus', url: 'https://www.juventus.com/en/rss', tier: 3, category: 'club', country: 'IT' },
  { name: 'PSG', url: 'https://www.psg.fr/rss/en', tier: 3, category: 'club', country: 'FR' },
  { name: 'AC Milan', url: 'https://www.acmilan.com/en/rss', tier: 3, category: 'club', country: 'IT' },
  { name: 'Inter Milan', url: 'https://www.inter.it/en/rss', tier: 3, category: 'club', country: 'IT' },
  { name: 'Atletico Madrid', url: 'https://en.atleticodemadrid.com/rss', tier: 3, category: 'club', country: 'ES' },
  { name: 'Borussia Dortmund', url: 'https://www.bvb.de/rss/en', tier: 3, category: 'club', country: 'DE' },
  { name: 'Napoli', url: 'https://www.sscnapoli.it/rss', tier: 3, category: 'club', country: 'IT' },
  { name: 'Benfica', url: 'https://www.slbenfica.pt/rss', tier: 3, category: 'club', country: 'PT' },
  { name: 'Ajax', url: 'https://www.ajax.nl/rss', tier: 3, category: 'club', country: 'NL' },
  { name: 'Celtic', url: 'https://www.celticfc.com/rss', tier: 3, category: 'club', country: 'UK' },
  { name: 'Rangers', url: 'https://www.rangers.co.uk/rss', tier: 3, category: 'club', country: 'UK' },

  { name: 'BBC Champions League', url: 'https://feeds.bbci.co.uk/sport/football/champions-league/rss.xml', tier: 3, category: 'breaking', country: 'UK' },
  { name: 'Sports Illustrated Soccer', url: 'https://www.si.com/rss/si_soccer.rss', tier: 3, category: 'analysis', country: 'US' },
  { name: 'World Soccer Talk', url: 'https://worldsoccertalk.com/feed/', tier: 3, category: 'breaking', country: 'US' },
  { name: 'Soccer America', url: 'https://www.socceramerica.com/rss/', tier: 3, category: 'breaking', country: 'US' },
  { name: 'Inside Futbol', url: 'https://www.insidefutbol.com/feed/', tier: 3, category: 'transfer', country: 'UK' },
  { name: 'Just Arsenal', url: 'https://justarsenal.com/feed', tier: 3, category: 'club', country: 'UK' },
  { name: 'This Is Anfield', url: 'https://www.thisisanfield.com/feed/', tier: 3, category: 'club', country: 'UK' },
  { name: 'Caught Offside', url: 'https://www.caughtoffside.com/feed/', tier: 3, category: 'transfer', country: 'UK' },
  { name: 'TeamTalk', url: 'https://www.teamtalk.com/feed', tier: 3, category: 'transfer', country: 'UK' },
  { name: 'Football Espana', url: 'https://www.footballespana.net/feed', tier: 3, category: 'breaking', country: 'ES' },
  { name: 'Get French Football News', url: 'https://www.getfrenchfootballnews.com/feed/', tier: 3, category: 'breaking', country: 'FR' },
  { name: 'Calcio Mercato', url: 'https://www.calciomercato.com/feed', tier: 3, category: 'transfer', country: 'IT' },
  { name: 'Sport Witness', url: 'https://sportwitness.co.uk/feed/', tier: 3, category: 'transfer', country: 'UK' },
  { name: 'SB Nation Soccer', url: 'https://www.sbnation.com/soccer/rss', tier: 3, category: 'analysis', country: 'US' },
  { name: 'African Football', url: 'https://www.africanfootball.com/rss', tier: 3, category: 'breaking', country: 'AF' },
  { name: 'Asian Football', url: 'https://www.the-afc.com/rss', tier: 3, category: 'breaking', country: 'AS' },
  { name: 'CONCACAF', url: 'https://www.concacaf.com/rss', tier: 3, category: 'breaking', country: 'NA' },
  { name: 'FIFA News', url: 'https://www.fifa.com/rss', tier: 3, category: 'breaking', country: 'global' },
  { name: 'UEFA News', url: 'https://www.uefa.com/rss', tier: 3, category: 'breaking', country: 'EU' },

  { name: 'Google News Football', url: 'https://news.google.com/rss/search?q=%22Premier+League%22+OR+%22Champions+League%22+OR+%22La+Liga%22+OR+%22Serie+A%22+OR+%22Bundesliga%22&hl=en', tier: 3, category: 'breaking', country: 'global' },
]

export async function POST() {
  let created = 0
  for (const feed of DEFAULT_FEEDS) {
    try {
      await prisma.feedSource.upsert({
        where: { url: feed.url },
        update: { name: feed.name, tier: feed.tier, category: feed.category, country: feed.country },
        create: feed,
      })
      created++
    } catch {}
  }
  return NextResponse.json({ created, total: DEFAULT_FEEDS.length })
}
