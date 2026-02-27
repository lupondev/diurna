import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { AdSlot } from '@/components/public/sportba'
import { searchPlayers, LEAGUES, LEAGUE_META, type ApiPlayer } from '@/lib/api-football'
import '../category.css'

export const metadata: Metadata = {
  title: 'Igrači — Diurna',
  description: 'Pretraži igrače iz Premier League, La Lige, Serie A, Bundeslige i Ligue 1.',
}

export const revalidate = 600

const POSITIONS = ['Attacker', 'Midfielder', 'Defender', 'Goalkeeper'] as const

const LEAGUE_OPTIONS = [
  { id: LEAGUES.PL, label: 'Premier League' },
  { id: LEAGUES.LALIGA, label: 'La Liga' },
  { id: LEAGUES.SERIEA, label: 'Serie A' },
  { id: LEAGUES.BUNDESLIGA, label: 'Bundesliga' },
  { id: LEAGUES.LIGUE1, label: 'Ligue 1' },
]

function positionLabel(pos: string | null): string {
  switch (pos) {
    case 'Attacker': return 'Napadač'
    case 'Midfielder': return 'Veznjak'
    case 'Defender': return 'Branič'
    case 'Goalkeeper': return 'Golman'
    default: return pos || '—'
  }
}

export default async function IgraciPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; league?: string; position?: string; page?: string }>
}) {
  const params = await searchParams
  const query = params.q || ''
  const leagueId = params.league ? Number(params.league) : undefined
  const posFilter = params.position || ''
  const page = Math.max(1, Number(params.page) || 1)

  const { players, totalPages } = await searchPlayers({
    search: query || undefined,
    league: leagueId,
    page,
  })

  const filtered = posFilter
    ? players.filter((p: ApiPlayer) => p.statistics[0]?.games.position === posFilter)
    : players

  function buildUrl(overrides: Record<string, string | undefined>): string {
    const p = new URLSearchParams()
    const merged = { q: query, league: params.league, position: params.position, page: '1', ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v)
    }
    if (p.get('page') === '1') p.delete('page')
    const qs = p.toString()
    return `/igraci${qs ? `?${qs}` : ''}`
  }

  return (
    <main className="sba-cat">
      <div className="sba-cat-header">
        <h1 className="sba-cat-title">Igrači</h1>
        <p className="sba-cat-desc">Pretraži igrače iz vodećih evropskih liga</p>
      </div>

      <div className="sba-cat-layout">
        <div className="sba-cat-main">
          <style>{`
.sba-search-bar {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;
}
.sba-search-input {
  flex: 1; min-width: 200px; padding: 10px 14px;
  background: var(--sba-bg-1); border: 1px solid var(--sba-border);
  border-radius: 8px; color: var(--sba-text-0); font-size: 14px;
  font-family: var(--sba-sans);
}
.sba-search-input::placeholder { color: var(--sba-text-3); }
.sba-search-input:focus { outline: none; border-color: var(--sba-accent); }
.sba-search-btn-go {
  padding: 10px 20px; background: var(--sba-accent); color: #fff;
  border: none; border-radius: 8px; font-family: var(--sba-mono);
  font-size: 12px; font-weight: 600; text-transform: uppercase;
  cursor: pointer;
}

.sba-filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px; }
.sba-filter-chip {
  font-family: var(--sba-mono); font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
  padding: 6px 12px; border-radius: 5px;
  text-decoration: none; transition: all 0.15s ease;
  color: var(--sba-text-2); background: var(--sba-bg-1);
  border: 1px solid var(--sba-border);
}
.sba-filter-chip:hover { border-color: var(--sba-accent); color: var(--sba-text-0); }
.sba-filter-chip--active { color: #fff; background: var(--sba-accent); border-color: var(--sba-accent); }

.sba-player-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
}
@media (min-width: 540px) { .sba-player-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 960px) { .sba-player-grid { grid-template-columns: repeat(4, 1fr); } }

.sba-player-card {
  display: flex; flex-direction: column; align-items: center;
  background: var(--sba-bg-1); border: 1px solid var(--sba-border);
  border-radius: 10px; padding: 16px 12px; text-decoration: none;
  transition: all 0.15s ease; text-align: center;
}
.sba-player-card:hover { border-color: var(--sba-accent); background: var(--sba-bg-2); }
.sba-player-photo {
  width: 64px; height: 64px; border-radius: 50%; object-fit: cover;
  background: var(--sba-bg-2); margin-bottom: 10px;
}
.sba-player-name {
  font-size: 13px; font-weight: 600; color: var(--sba-text-0);
  margin-bottom: 4px; line-height: 1.3;
}
.sba-player-club {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--sba-text-2); margin-bottom: 6px;
}
.sba-player-pos {
  font-family: var(--sba-mono); font-size: 10px; font-weight: 600;
  text-transform: uppercase; color: var(--sba-text-3); margin-bottom: 8px;
}
.sba-player-stats {
  display: flex; gap: 12px; font-family: var(--sba-mono); font-size: 11px;
}
.sba-player-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.sba-player-stat-val { font-weight: 700; color: var(--sba-text-0); }
.sba-player-stat-label { font-size: 9px; color: var(--sba-text-3); text-transform: uppercase; }

.sba-pagination {
  display: flex; justify-content: center; align-items: center; gap: 8px;
  margin-top: 24px;
}
.sba-page-link {
  font-family: var(--sba-mono); font-size: 12px; font-weight: 600;
  padding: 8px 16px; border-radius: 6px;
  text-decoration: none; transition: all 0.15s ease;
  color: var(--sba-text-2); background: var(--sba-bg-1);
  border: 1px solid var(--sba-border);
}
.sba-page-link:hover { border-color: var(--sba-accent); color: var(--sba-text-0); }
.sba-page-info {
  font-family: var(--sba-mono); font-size: 11px; color: var(--sba-text-3);
}

.sba-empty { text-align: center; padding: 48px 16px; color: var(--sba-text-3); font-size: 14px; }
          `}</style>

          {/* Search */}
          <form action="/igraci" method="get" className="sba-search-bar">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Pretraži igrače (min. 3 slova)..."
              className="sba-search-input"
            />
            {leagueId && <input type="hidden" name="league" value={leagueId} />}
            {posFilter && <input type="hidden" name="position" value={posFilter} />}
            <button type="submit" className="sba-search-btn-go">Traži</button>
          </form>

          {/* League filters */}
          <div className="sba-filters">
            <Link
              href={buildUrl({ league: undefined, page: '1' })}
              className={`sba-filter-chip${!leagueId ? ' sba-filter-chip--active' : ''}`}
            >
              Sve lige
            </Link>
            {LEAGUE_OPTIONS.map((l) => (
              <Link
                key={l.id}
                href={buildUrl({ league: l.id.toString(), page: '1' })}
                className={`sba-filter-chip${leagueId === l.id ? ' sba-filter-chip--active' : ''}`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Position filters */}
          <div className="sba-filters">
            <Link
              href={buildUrl({ position: undefined, page: '1' })}
              className={`sba-filter-chip${!posFilter ? ' sba-filter-chip--active' : ''}`}
            >
              Sve pozicije
            </Link>
            {POSITIONS.map((pos) => (
              <Link
                key={pos}
                href={buildUrl({ position: pos, page: '1' })}
                className={`sba-filter-chip${posFilter === pos ? ' sba-filter-chip--active' : ''}`}
              >
                {positionLabel(pos)}
              </Link>
            ))}
          </div>

          {/* Player grid */}
          {filtered.length === 0 ? (
            <div className="sba-empty">
              {query && query.length < 3
                ? 'Unesite najmanje 3 slova za pretragu.'
                : 'Nema rezultata za odabrane filtere.'}
            </div>
          ) : (
            <div className="sba-player-grid">
              {filtered.map((p: ApiPlayer) => {
                const stat = p.statistics[0]
                return (
                  <Link
                    key={p.player.id}
                    href={`/igraci/${p.player.id}`}
                    className="sba-player-card"
                  >
                    <Image
                      src={p.player.photo}
                      alt={p.player.name}
                      width={64}
                      height={64}
                      className="sba-player-photo"
                      unoptimized
                    />
                    <span className="sba-player-name">{p.player.name}</span>
                    <span className="sba-player-club">
                      {stat?.team.logo && (
                        <Image src={stat.team.logo} alt="" width={14} height={14} unoptimized />
                      )}
                      {stat?.team.name || '—'}
                    </span>
                    <span className="sba-player-pos">{positionLabel(stat?.games.position ?? null)}</span>
                    <div className="sba-player-stats">
                      <span className="sba-player-stat">
                        <span className="sba-player-stat-val">{stat?.goals.total ?? 0}</span>
                        <span className="sba-player-stat-label">Gol</span>
                      </span>
                      <span className="sba-player-stat">
                        <span className="sba-player-stat-val">{stat?.goals.assists ?? 0}</span>
                        <span className="sba-player-stat-label">Asist</span>
                      </span>
                      <span className="sba-player-stat">
                        <span className="sba-player-stat-val">{stat?.games.appearances ?? 0}</span>
                        <span className="sba-player-stat-label">Utk</span>
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="sba-pagination">
              {page > 1 && (
                <Link href={buildUrl({ page: (page - 1).toString() })} className="sba-page-link">
                  ← Prethodna
                </Link>
              )}
              <span className="sba-page-info">
                Stranica {page} od {totalPages}
              </span>
              {page < totalPages && (
                <Link href={buildUrl({ page: (page + 1).toString() })} className="sba-page-link">
                  Sljedeća →
                </Link>
              )}
            </div>
          )}

          <AdSlot variant="rectangle" />
        </div>

        <aside className="sba-cat-rail">
          <AdSlot variant="skyscraper" />
        </aside>
      </div>
    </main>
  )
}
