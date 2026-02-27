import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { AdSlot } from '@/components/public/sportba'
import { getFixturesByDate, dateOffsetStr, LEAGUE_META, type ApiFixture, mapStatus, formatTime } from '@/lib/api-football'
import { canonicalUrl } from '@/lib/seo'
import '../category.css'

export const metadata: Metadata = {
  title: 'Utakmice — Diurna',
  description: 'Najave utakmica, rezultati i analize iz najpopularnijih liga.',
  alternates: { canonical: canonicalUrl('/utakmice') },
}

export const revalidate = 600

const TABS = [
  { key: 'today', label: 'Danas' },
  { key: 'tomorrow', label: 'Sutra' },
  { key: 'week', label: 'Ova sedmica' },
] as const

type Tab = (typeof TABS)[number]['key']

function groupByLeague(fixtures: ApiFixture[]): Record<string, ApiFixture[]> {
  const groups: Record<string, ApiFixture[]> = {}
  for (const f of fixtures) {
    const key = f.league.id.toString()
    if (!groups[key]) groups[key] = []
    groups[key].push(f)
  }
  return groups
}

export default async function UtakmicePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams
  const tab: Tab = (params.tab === 'tomorrow' || params.tab === 'week') ? params.tab : 'today'

  let fixtures: ApiFixture[] = []

  if (tab === 'today') {
    fixtures = await getFixturesByDate(dateOffsetStr(0))
  } else if (tab === 'tomorrow') {
    fixtures = await getFixturesByDate(dateOffsetStr(1))
  } else {
    const days = await Promise.all(
      Array.from({ length: 7 }, (_, i) => getFixturesByDate(dateOffsetStr(i)))
    )
    fixtures = days.flat()
  }

  const liveFixtures = fixtures.filter((f) => mapStatus(f.fixture.status.short) === 'live')
  const grouped = groupByLeague(fixtures)
  const leagueIds = Object.keys(grouped).sort((a, b) => {
    const order = [39, 140, 135, 78, 61, 2]
    return order.indexOf(Number(a)) - order.indexOf(Number(b))
  })

  const categoryTitle = 'Utakmice'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${categoryTitle} — SportBa`,
    description: `Najnovije vijesti iz kategorije ${categoryTitle}`,
    url: canonicalUrl('/utakmice'),
    isPartOf: { '@type': 'WebSite', name: 'SportBa', url: canonicalUrl('/') },
  }

  return (
    <main className="sba-cat">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="sba-cat-header">
        <h1 className="sba-cat-title">Utakmice</h1>
        <p className="sba-cat-desc">Najave, rezultati i analize utakmica</p>
      </div>

      <div className="sba-cat-layout">
        <div className="sba-cat-main">
          <style>{`
.sba-tabs { display: flex; gap: 4px; margin-bottom: 24px; }
.sba-tab {
  font-family: var(--sba-mono); font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  padding: 8px 16px; border-radius: 6px;
  text-decoration: none; transition: all 0.15s ease;
  color: var(--sba-text-2); background: var(--sba-bg-1);
  border: 1px solid var(--sba-border);
}
.sba-tab:hover { color: var(--sba-text-0); border-color: var(--sba-accent); }
.sba-tab--active { color: #fff; background: var(--sba-accent); border-color: var(--sba-accent); }

.sba-league-group { margin-bottom: 32px; }
.sba-league-head {
  display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
  padding-bottom: 8px; border-bottom: 1px solid var(--sba-border);
}
.sba-league-logo { border-radius: 4px; }
.sba-league-name {
  font-family: var(--sba-mono); font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em; color: var(--sba-text-0);
}
.sba-league-country {
  font-size: 11px; color: var(--sba-text-3); margin-left: auto;
}

.sba-fixture-list { display: flex; flex-direction: column; gap: 6px; }
.sba-fixture {
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  gap: 12px; padding: 12px 16px; background: var(--sba-bg-1);
  border: 1px solid var(--sba-border); border-radius: 8px;
  text-decoration: none; transition: all 0.15s ease;
}
.sba-fixture:hover { background: var(--sba-bg-2); border-color: var(--sba-accent); }
.sba-fixture--live { border-left: 3px solid var(--sba-live); }
.sba-fixture--ft { border-left: 3px solid var(--sba-text-3); }

.sba-fixture-team {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 500; color: var(--sba-text-0);
}
.sba-fixture-team--away { justify-content: flex-end; text-align: right; }
.sba-fixture-team-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.sba-fixture-center { text-align: center; min-width: 60px; }
.sba-fixture-score {
  font-family: var(--sba-mono); font-size: 20px; font-weight: 700; color: var(--sba-text-0);
}
.sba-fixture-time {
  font-family: var(--sba-mono); font-size: 14px; font-weight: 600; color: var(--sba-text-2);
}
.sba-fixture-status {
  font-family: var(--sba-mono); font-size: 10px; font-weight: 600;
  text-transform: uppercase; margin-top: 2px;
}
.sba-fixture-status--live { color: var(--sba-live); }
.sba-fixture-status--ft { color: var(--sba-text-3); }

.sba-live-count {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--sba-mono); font-size: 12px; font-weight: 600;
  color: var(--sba-live); margin-bottom: 20px;
}
.sba-live-count-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--sba-live);
  animation: sba-pulse 2s ease-in-out infinite;
}

.sba-empty {
  text-align: center; padding: 48px 16px; color: var(--sba-text-3);
  font-size: 14px;
}

.sba-fixture-date {
  font-family: var(--sba-mono); font-size: 10px; color: var(--sba-text-3);
  text-transform: uppercase; letter-spacing: 0.05em;
}
          `}</style>

          {/* Tabs */}
          <div className="sba-tabs">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === 'today' ? '/utakmice' : `/utakmice?tab=${t.key}`}
                className={`sba-tab${tab === t.key ? ' sba-tab--active' : ''}`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          {/* Live count */}
          {liveFixtures.length > 0 && (
            <div className="sba-live-count">
              <span className="sba-live-count-dot" />
              {liveFixtures.length} {liveFixtures.length === 1 ? 'utakmica' : 'utakmica'} uživo
            </div>
          )}

          {/* Fixtures grouped by league */}
          {leagueIds.length === 0 && (
            <div className="sba-empty">Nema utakmica za odabrani period.</div>
          )}

          {leagueIds.map((lid) => {
            const meta = LEAGUE_META[Number(lid)]
            const items = grouped[lid].sort((a, b) => a.fixture.timestamp - b.fixture.timestamp)
            return (
              <section key={lid} className="sba-league-group">
                <div className="sba-league-head">
                  {items[0]?.league.logo && (
                    <Image
                      src={items[0].league.logo}
                      alt=""
                      width={24}
                      height={24}
                      className="sba-league-logo"
                      unoptimized
                    />
                  )}
                  <span className="sba-league-name">{meta?.name || items[0]?.league.name}</span>
                  <span className="sba-league-country">{meta?.country}</span>
                </div>
                <div className="sba-fixture-list">
                  {items.map((f) => {
                    const status = mapStatus(f.fixture.status.short)
                    const showDate = tab === 'week'
                    return (
                      <div
                        key={f.fixture.id}
                        className={`sba-fixture${status === 'live' ? ' sba-fixture--live' : ''}${status === 'ft' ? ' sba-fixture--ft' : ''}`}
                      >
                        <div className="sba-fixture-team">
                          {f.teams.home.logo && (
                            <Image src={f.teams.home.logo} alt="" width={20} height={20} unoptimized />
                          )}
                          <span className="sba-fixture-team-name">{f.teams.home.name}</span>
                        </div>
                        <div className="sba-fixture-center">
                          {status === 'scheduled' ? (
                            <>
                              <div className="sba-fixture-time">{formatTime(f.fixture.date)}</div>
                              {showDate && (
                                <div className="sba-fixture-date">
                                  {new Date(f.fixture.date).toLocaleDateString('bs-BA', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="sba-fixture-score">
                                {f.goals.home ?? 0} &ndash; {f.goals.away ?? 0}
                              </div>
                              <div className={`sba-fixture-status sba-fixture-status--${status}`}>
                                {status === 'live' && f.fixture.status.elapsed
                                  ? `${f.fixture.status.elapsed}'`
                                  : status === 'live'
                                    ? f.fixture.status.short
                                    : 'FT'}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="sba-fixture-team sba-fixture-team--away">
                          <span className="sba-fixture-team-name">{f.teams.away.name}</span>
                          {f.teams.away.logo && (
                            <Image src={f.teams.away.logo} alt="" width={20} height={20} unoptimized />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}

          <AdSlot variant="rectangle" />
        </div>

        <aside className="sba-cat-rail">
          <AdSlot variant="skyscraper" />
        </aside>
      </div>
    </main>
  )
}
