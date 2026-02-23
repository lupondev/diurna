import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { AdSlot } from '@/components/public/sportba'
import { getStandings, LEAGUES, LEAGUE_META, type ApiStanding } from '@/lib/api-football'
import { buildMetadata } from '@/lib/seo'
import '../category.css'

export const revalidate = 3600

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ league?: string }> }): Promise<Metadata> {
  const params = await searchParams
  const leagueId = params.league ? Number(params.league) : LEAGUES.PL
  const meta = LEAGUE_META[leagueId]
  const leagueName = meta?.name || 'Fudbalska liga'
  return buildMetadata({
    pageTitle: `Tabela — ${leagueName}`,
    description: `Tabela ${leagueName}. Poredak klubova, bodovi, pobjede i forma sezone.`,
    canonicalPath: '/tabela',
  })
}

const LEAGUE_TABS = [
  { id: LEAGUES.PL, label: 'PL' },
  { id: LEAGUES.LALIGA, label: 'La Liga' },
  { id: LEAGUES.SERIEA, label: 'Serie A' },
  { id: LEAGUES.BUNDESLIGA, label: 'Bundesliga' },
  { id: LEAGUES.LIGUE1, label: 'Ligue 1' },
  { id: LEAGUES.UCL, label: 'UCL' },
]

function FormDots({ form }: { form: string | null }) {
  if (!form) return null
  return (
    <span className="sba-form-dots">
      {form.split('').slice(-5).map((ch, i) => (
        <span
          key={i}
          className={`sba-form-dot${ch === 'W' ? ' sba-form-dot--w' : ch === 'D' ? ' sba-form-dot--d' : ' sba-form-dot--l'}`}
          title={ch === 'W' ? 'Pobjeda' : ch === 'D' ? 'Neriješeno' : 'Poraz'}
        >
          {ch}
        </span>
      ))}
    </span>
  )
}

export default async function TabelaPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>
}) {
  const params = await searchParams
  const leagueId = params.league ? Number(params.league) : LEAGUES.PL
  const validLeague = LEAGUE_TABS.find((t) => t.id === leagueId)?.id ?? LEAGUES.PL

  const standings = await getStandings(validLeague)
  const meta = LEAGUE_META[validLeague]

  return (
    <main className="sba-cat">
      <div className="sba-cat-header">
        <h1 className="sba-cat-title">Tabela</h1>
        <p className="sba-cat-desc">Tabele vodećih evropskih fudbalskih liga</p>
      </div>

      <div className="sba-cat-layout">
        <div className="sba-cat-main">
          <style>{`
.sba-tabs { display: flex; gap: 4px; margin-bottom: 24px; flex-wrap: wrap; }
.sba-tab {
  font-family: var(--sba-mono); font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  padding: 8px 14px; border-radius: 6px;
  text-decoration: none; transition: all 0.15s ease;
  color: var(--sba-text-2); background: var(--sba-bg-1);
  border: 1px solid var(--sba-border);
}
.sba-tab:hover { color: var(--sba-text-0); border-color: var(--sba-accent); }
.sba-tab--active { color: #fff; background: var(--sba-accent); border-color: var(--sba-accent); }

.sba-table-wrap {
  overflow-x: auto; -webkit-overflow-scrolling: touch;
  border: 1px solid var(--sba-border); border-radius: 10px;
  background: var(--sba-bg-1);
}
.sba-table {
  width: 100%; border-collapse: collapse; font-size: 13px;
  white-space: nowrap;
}
.sba-table th {
  font-family: var(--sba-mono); font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--sba-text-3); padding: 10px 8px;
  text-align: center; border-bottom: 1px solid var(--sba-border);
  background: var(--sba-bg-2); position: sticky; top: 0;
}
.sba-table th:first-child,
.sba-table th:nth-child(2),
.sba-table th:nth-child(3) { text-align: left; }

.sba-table td {
  padding: 10px 8px; text-align: center;
  border-bottom: 1px solid var(--sba-border-subtle);
  color: var(--sba-text-1);
}
.sba-table td:first-child,
.sba-table td:nth-child(2),
.sba-table td:nth-child(3) { text-align: left; }

.sba-table tr:last-child td { border-bottom: none; }
.sba-table tr:hover td { background: var(--sba-bg-2); }

.sba-table-pos {
  font-family: var(--sba-mono); font-weight: 700; color: var(--sba-text-0);
  width: 32px; min-width: 32px;
}
.sba-table-team {
  display: flex; align-items: center; gap: 8px; min-width: 160px;
}
.sba-table-team-name { font-weight: 500; color: var(--sba-text-0); }
.sba-table-pts {
  font-family: var(--sba-mono); font-weight: 700; color: var(--sba-accent);
}
.sba-table-gd {
  font-family: var(--sba-mono); font-weight: 600;
}
.sba-table-gd--pos { color: var(--sba-green); }
.sba-table-gd--neg { color: var(--sba-red); }

.sba-form-dots { display: flex; gap: 3px; justify-content: center; }
.sba-form-dot {
  width: 18px; height: 18px; border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--sba-mono); font-size: 9px; font-weight: 700; color: #fff;
}
.sba-form-dot--w { background: var(--sba-green); }
.sba-form-dot--d { background: var(--sba-yellow); }
.sba-form-dot--l { background: var(--sba-red); }

.sba-table-league-name {
  font-family: var(--sba-mono); font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--sba-text-3); margin-bottom: 12px;
}

.sba-empty { text-align: center; padding: 48px 16px; color: var(--sba-text-3); font-size: 14px; }

/* Hide less important cols on mobile */
@media (max-width: 639px) {
  .sba-hide-mobile { display: none; }
}
          `}</style>

          {/* League tabs */}
          <div className="sba-tabs">
            {LEAGUE_TABS.map((t) => (
              <Link
                key={t.id}
                href={`/tabela?league=${t.id}`}
                className={`sba-tab${validLeague === t.id ? ' sba-tab--active' : ''}`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          <div className="sba-table-league-name">{meta?.name} — {meta?.country}</div>

          {standings.length === 0 ? (
            <div className="sba-empty">Tabela nije dostupna za odabranu ligu.</div>
          ) : (
            <div className="sba-table-wrap">
              <table className="sba-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th></th>
                    <th>Klub</th>
                    <th>U</th>
                    <th className="sba-hide-mobile">P</th>
                    <th className="sba-hide-mobile">N</th>
                    <th className="sba-hide-mobile">I</th>
                    <th className="sba-hide-mobile">GD</th>
                    <th className="sba-hide-mobile">GR</th>
                    <th>+/−</th>
                    <th>Bod</th>
                    <th className="sba-hide-mobile">Forma</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s: ApiStanding) => (
                    <tr key={s.team.id}>
                      <td className="sba-table-pos">{s.rank}</td>
                      <td>
                        {s.team.logo && (
                          <Image src={s.team.logo} alt="" width={20} height={20} unoptimized />
                        )}
                      </td>
                      <td>
                        <span className="sba-table-team-name">{s.team.name}</span>
                      </td>
                      <td>{s.all.played}</td>
                      <td className="sba-hide-mobile">{s.all.win}</td>
                      <td className="sba-hide-mobile">{s.all.draw}</td>
                      <td className="sba-hide-mobile">{s.all.lose}</td>
                      <td className="sba-hide-mobile">{s.all.goals.for}</td>
                      <td className="sba-hide-mobile">{s.all.goals.against}</td>
                      <td>
                        <span className={`sba-table-gd${s.goalsDiff > 0 ? ' sba-table-gd--pos' : s.goalsDiff < 0 ? ' sba-table-gd--neg' : ''}`}>
                          {s.goalsDiff > 0 ? '+' : ''}{s.goalsDiff}
                        </span>
                      </td>
                      <td className="sba-table-pts">{s.points}</td>
                      <td className="sba-hide-mobile">
                        <FormDots form={s.form} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
