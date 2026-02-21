'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AthleteProfile } from './page'

const SPORT_EMOJI: Record<string, string> = {
  fudbal: '\u26BD',
  'košarka': '\uD83C\uDFC0',
  rukomet: '\uD83E\uDD3E',
  atletika: '\uD83C\uDFC3',
  boks: '\uD83E\uDD4A',
  'džudo': '\uD83E\uDD4B',
  plivanje: '\uD83C\uDFCA',
  tenis: '\uD83C\uDFBE',
}

const NATIONALITY_FLAG: Record<string, string> = {
  BA: '\uD83C\uDDE7\uD83C\uDDE6',
  HR: '\uD83C\uDDED\uD83C\uDDF7',
  RS: '\uD83C\uDDF7\uD83C\uDDF8',
}

const TABS = [
  { id: 'bio', label: 'Biografija' },
  { id: 'stats', label: 'Statistike' },
  { id: 'trophies', label: 'Trofejni kabinet' },
  { id: 'career', label: 'Karijera' },
  { id: 'quotes', label: 'Citati' },
]

export function AthleteProfileClient({ athlete }: { athlete: AthleteProfile }) {
  const [activeTab, setActiveTab] = useState('bio')

  const flag = NATIONALITY_FLAG[athlete.nationality] || '\uD83C\uDDE7\uD83C\uDDE6'
  const emoji = SPORT_EMOJI[athlete.sport] || '\uD83C\uDFC5'

  function scrollToSection(id: string) {
    setActiveTab(id)
    const el = document.getElementById(`section-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const birthDisplay = athlete.birthDate
    ? new Date(athlete.birthDate).toLocaleDateString('bs-BA', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="leg-page">
      {/* Hero */}
      <div className="ath-hero">
        <div className="ath-hero-inner">
          <div className="ath-hero-photo">
            {athlete.photo ? (
              <img src={athlete.photo} alt={athlete.name} />
            ) : (
              emoji
            )}
            <div className="ath-hero-flag">
              {flag} {athlete.nationality}
            </div>
          </div>

          <div className="ath-hero-info">
            <div className="ath-hero-sport">{athlete.sport} {athlete.position ? `\u00b7 ${athlete.position}` : ''}</div>
            <h1 className="ath-hero-name">{athlete.name}</h1>
            {athlete.nickname && (
              <div className="ath-hero-nickname">&ldquo;{athlete.nickname}&rdquo;</div>
            )}

            <div className="ath-hero-stats">
              {athlete.totalApps != null && (
                <div className="ath-hero-stat">
                  <div className="ath-hero-stat-value">{athlete.totalApps}</div>
                  <div className="ath-hero-stat-label">Utakmice</div>
                </div>
              )}
              {athlete.totalGoals != null && (
                <div className="ath-hero-stat">
                  <div className="ath-hero-stat-value">{athlete.totalGoals}</div>
                  <div className="ath-hero-stat-label">Golovi</div>
                </div>
              )}
              {athlete.intGoals != null && (
                <div className="ath-hero-stat">
                  <div className="ath-hero-stat-value">{athlete.intGoals}</div>
                  <div className="ath-hero-stat-label">Rep. golovi</div>
                </div>
              )}
              {athlete.careerYears != null && (
                <div className="ath-hero-stat">
                  <div className="ath-hero-stat-value">{athlete.careerYears}</div>
                  <div className="ath-hero-stat-label">Godina</div>
                </div>
              )}
              {athlete.legendRank != null && (
                <div className="ath-hero-stat">
                  <div className="ath-hero-stat-value">#{athlete.legendRank}</div>
                  <div className="ath-hero-stat-label">Rang</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Tabs */}
      <div className="ath-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`ath-tab ${activeTab === tab.id ? 'ath-tab--active' : ''}`}
            onClick={() => scrollToSection(tab.id)}
          >
            {tab.label}
          </button>
        ))}
        <Link
          href="/legende"
          style={{ marginLeft: 'auto', padding: '14px 20px', fontSize: 13, color: '#666', textDecoration: 'none' }}
        >
          &larr; Sve legende
        </Link>
      </div>

      {/* Content */}
      <div className="ath-content">
        {/* Biography */}
        <div id="section-bio" className="ath-section">
          <h2 className="ath-section-title">Biografija</h2>

          {athlete.bioLead && (
            <div className="ath-bio-lead">{athlete.bioLead}</div>
          )}

          {athlete.quotes.length > 0 && (
            <div className="ath-quote">
              <div className="ath-quote-text">&ldquo;{athlete.quotes[0].text}&rdquo;</div>
              {athlete.quotes[0].source && (
                <div className="ath-quote-source">
                  — {athlete.quotes[0].source}{athlete.quotes[0].year ? `, ${athlete.quotes[0].year}` : ''}
                </div>
              )}
            </div>
          )}

          {athlete.bioFull && (
            <div className="ath-bio-full">
              {athlete.bioFull.split('\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}

          {/* Timeline */}
          {athlete.timeline.length > 0 && (
            <>
              <h3 className="ath-section-title" style={{ fontSize: 20, marginTop: 32 }}>Karijerni put</h3>
              <div className="ath-timeline">
                {athlete.timeline.map((t, i) => (
                  <div key={i} className={`ath-tl-item ${t.highlight ? 'ath-tl-item--highlight' : ''}`}>
                    <div className="ath-tl-year">{t.year}</div>
                    <div className="ath-tl-event">{t.event}</div>
                    {t.detail && <div className="ath-tl-detail">{t.detail}</div>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Sidebar-style info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 32 }}>
            <div className="ath-sidebar-card">
              <div className="ath-sidebar-title">Lični podaci</div>
              {birthDisplay && (
                <div className="ath-sidebar-row">
                  <span className="ath-sidebar-label">Datum rođenja</span>
                  <span className="ath-sidebar-value">{birthDisplay}</span>
                </div>
              )}
              {athlete.birthPlace && (
                <div className="ath-sidebar-row">
                  <span className="ath-sidebar-label">Mjesto rođenja</span>
                  <span className="ath-sidebar-value">{athlete.birthPlace}</span>
                </div>
              )}
              {athlete.height && (
                <div className="ath-sidebar-row">
                  <span className="ath-sidebar-label">Visina</span>
                  <span className="ath-sidebar-value">{athlete.height} cm</span>
                </div>
              )}
              {athlete.strongerFoot && (
                <div className="ath-sidebar-row">
                  <span className="ath-sidebar-label">Jača noga</span>
                  <span className="ath-sidebar-value">{athlete.strongerFoot}</span>
                </div>
              )}
              <div className="ath-sidebar-row">
                <span className="ath-sidebar-label">Nacionalnost</span>
                <span className="ath-sidebar-value">{flag} {athlete.nationality}</span>
              </div>
            </div>

            {athlete.trophies.length > 0 && (
              <div className="ath-sidebar-card">
                <div className="ath-sidebar-title">Trofejni kabinet</div>
                <div className="ath-trophies-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  {athlete.trophies.slice(0, 6).map((t, i) => (
                    <div key={i} className="ath-trophy">
                      <div className="ath-trophy-icon">{t.icon || '\uD83C\uDFC6'}</div>
                      <div className="ath-trophy-name">{t.name}</div>
                      <div className="ath-trophy-detail">{t.club}{t.year ? ` (${t.year})` : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div id="section-stats" className="ath-section">
          <h2 className="ath-section-title">Statistike</h2>
          <div className="ath-stats-grid">
            {athlete.totalApps != null && (
              <div className="ath-stat-card">
                <div className="ath-stat-card-value">{athlete.totalApps}</div>
                <div className="ath-stat-card-label">Ukupne utakmice</div>
              </div>
            )}
            {athlete.totalGoals != null && (
              <div className="ath-stat-card">
                <div className="ath-stat-card-value">{athlete.totalGoals}</div>
                <div className="ath-stat-card-label">Ukupni golovi</div>
              </div>
            )}
            {athlete.intApps != null && (
              <div className="ath-stat-card">
                <div className="ath-stat-card-value">{athlete.intApps}</div>
                <div className="ath-stat-card-label">Rep. utakmice</div>
              </div>
            )}
            {athlete.intGoals != null && (
              <div className="ath-stat-card">
                <div className="ath-stat-card-value">{athlete.intGoals}</div>
                <div className="ath-stat-card-label">Rep. golovi</div>
              </div>
            )}
          </div>

          {/* Clubs Table */}
          {athlete.clubs.length > 0 && (
            <>
              <h3 className="ath-section-title" style={{ fontSize: 20, marginTop: 32 }}>Klubovi</h3>
              <table className="ath-clubs-table">
                <thead>
                  <tr>
                    <th>Klub</th>
                    <th>Period</th>
                    <th>Utakmice</th>
                    <th>Golovi</th>
                  </tr>
                </thead>
                <tbody>
                  {athlete.clubs.map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.years}</td>
                      <td>{c.apps ?? '–'}</td>
                      <td>{c.goals ?? '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Trophies */}
        <div id="section-trophies" className="ath-section">
          <h2 className="ath-section-title">Trofejni kabinet</h2>
          {athlete.trophies.length > 0 ? (
            <div className="ath-trophies-grid">
              {athlete.trophies.map((t, i) => (
                <div key={i} className="ath-trophy">
                  <div className="ath-trophy-icon">{t.icon || '\uD83C\uDFC6'}</div>
                  <div className="ath-trophy-name">{t.name}</div>
                  <div className="ath-trophy-detail">{t.club}{t.year ? ` (${t.year})` : ''}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', fontSize: 14 }}>Nema zabilježenih trofeja.</p>
          )}
        </div>

        {/* Career */}
        <div id="section-career" className="ath-section">
          <h2 className="ath-section-title">Karijera</h2>
          {athlete.timeline.length > 0 ? (
            <div className="ath-timeline">
              {athlete.timeline.map((t, i) => (
                <div key={i} className={`ath-tl-item ${t.highlight ? 'ath-tl-item--highlight' : ''}`}>
                  <div className="ath-tl-year">{t.year}</div>
                  <div className="ath-tl-event">{t.event}</div>
                  {t.detail && <div className="ath-tl-detail">{t.detail}</div>}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', fontSize: 14 }}>Nema zabilježenih karijernih podataka.</p>
          )}
        </div>

        {/* Quotes */}
        <div id="section-quotes" className="ath-section">
          <h2 className="ath-section-title">Citati</h2>
          {athlete.quotes.length > 0 ? (
            athlete.quotes.map((q, i) => (
              <div key={i} className="ath-quote">
                <div className="ath-quote-text">&ldquo;{q.text}&rdquo;</div>
                <div className="ath-quote-source">
                  — {q.source || athlete.name}{q.year ? `, ${q.year}` : ''}
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#666', fontSize: 14 }}>Nema zabilježenih citata.</p>
          )}
        </div>
      </div>
    </div>
  )
}
