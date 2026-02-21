'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { OrgCard } from './page'

const SPORT_EMOJI: Record<string, string> = {
  fudbal: '\u26BD',
  'košarka': '\uD83C\uDFC0',
  rukomet: '\uD83E\uDD3E',
  atletika: '\uD83C\uDFC3',
  boks: '\uD83E\uDD4A',
  'džudo': '\uD83E\uDD4B',
  plivanje: '\uD83C\uDFCA',
  tenis: '\uD83C\uDFBE',
  olimpijski: '\uD83C\uDFAE',
}

const TYPE_FILTERS = [
  { key: 'svi', label: 'Svi' },
  { key: 'savez', label: 'Savezi' },
  { key: 'klub', label: 'Klubovi' },
  { key: 'liga', label: 'Lige' },
]

const ENTITY_FILTERS = [
  { key: 'svi', label: 'Svi entiteti' },
  { key: 'FBiH', label: 'FBiH' },
  { key: 'RS', label: 'RS' },
  { key: 'BD', label: 'Brčko' },
]

function getTypeBadgeClass(type: string): string {
  const map: Record<string, string> = {
    savez: 'org-type-badge--savez',
    klub: 'org-type-badge--klub',
    liga: 'org-type-badge--liga',
    udruzenje: 'org-type-badge--udruzenje',
    federacija: 'org-type-badge--federacija',
  }
  return map[type] || ''
}

export function OrganizacijeClient({ orgs }: { orgs: OrgCard[] }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('svi')
  const [entityFilter, setEntityFilter] = useState('svi')
  const [sportFilter, setSportFilter] = useState('svi')

  const sportCategories = useMemo(() => {
    const map = new Map<string, number>()
    orgs.forEach((o) => map.set(o.sport, (map.get(o.sport) || 0) + 1))
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [orgs])

  const levelCategories = useMemo(() => {
    const map = new Map<string, number>()
    orgs.forEach((o) => map.set(o.level, (map.get(o.level) || 0) + 1))
    return Array.from(map.entries())
  }, [orgs])

  const filtered = useMemo(() => {
    return orgs.filter((o) => {
      if (typeFilter !== 'svi' && o.type !== typeFilter) return false
      if (entityFilter !== 'svi' && o.entity !== entityFilter) return false
      if (sportFilter !== 'svi' && o.sport !== sportFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const match = o.name.toLowerCase().includes(q)
          || (o.nameShort || '').toLowerCase().includes(q)
          || (o.city || '').toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [orgs, typeFilter, entityFilter, sportFilter, search])

  const featured = filtered.find((o) => o.featured)
  const regular = filtered.filter((o) => !o.featured)

  // Stats for the bar
  const totalSaveza = orgs.filter((o) => o.type === 'savez').length
  const totalKlubova = orgs.filter((o) => o.type === 'klub').length
  const totalSportova = new Set(orgs.map((o) => o.sport)).size

  if (orgs.length === 0) {
    return (
      <div className="org-page">
        <div className="org-header">
          <h1>Sportske organizacije BiH</h1>
          <p>Savezi, klubovi i lige u Bosni i Hercegovini</p>
        </div>
        <div className="org-empty">
          <div className="org-empty-icon">{'\uD83C\uDFDB\uFE0F'}</div>
          <div className="org-empty-title">Uskoro</div>
          <p style={{ color: '#666', marginTop: 8 }}>Baza organizacija je u pripremi.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="org-page">
      <div className="org-header">
        <h1>Sportske organizacije BiH</h1>
        <p>Kompletna baza sportskih saveza, klubova i liga u Bosni i Hercegovini</p>
      </div>

      {/* Stats Bar */}
      <div className="org-stats-bar">
        <div className="org-stat">
          <div className="org-stat-value">{totalSaveza}</div>
          <div className="org-stat-label">Saveza</div>
        </div>
        <div className="org-stat">
          <div className="org-stat-value">{totalKlubova}</div>
          <div className="org-stat-label">Klubova</div>
        </div>
        <div className="org-stat">
          <div className="org-stat-value">{totalSportova}</div>
          <div className="org-stat-label">Sportova</div>
        </div>
        <div className="org-stat">
          <div className="org-stat-value">{orgs.length}</div>
          <div className="org-stat-label">Ukupno</div>
        </div>
      </div>

      {/* Controls */}
      <div className="org-controls">
        <input
          className="org-search"
          type="text"
          placeholder="Pretraži organizacije..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`leg-chip ${typeFilter === f.key ? 'leg-chip--active' : ''}`}
            onClick={() => setTypeFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        {ENTITY_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`leg-chip ${entityFilter === f.key ? 'leg-chip--active' : ''}`}
            onClick={() => setEntityFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Layout */}
      <div className="org-layout">
        {/* Sidebar */}
        <aside className="org-sidebar">
          <div className="org-sidebar-section">
            <div className="org-sidebar-title">Sportovi</div>
            <button
              className={`org-sidebar-item ${sportFilter === 'svi' ? 'org-sidebar-item--active' : ''}`}
              onClick={() => setSportFilter('svi')}
            >
              <span>Svi sportovi</span>
              <span className="org-sidebar-count">{orgs.length}</span>
            </button>
            {sportCategories.map(([sport, count]) => (
              <button
                key={sport}
                className={`org-sidebar-item ${sportFilter === sport ? 'org-sidebar-item--active' : ''}`}
                onClick={() => setSportFilter(sport)}
              >
                <span>{SPORT_EMOJI[sport] || ''} {sport}</span>
                <span className="org-sidebar-count">{count}</span>
              </button>
            ))}
          </div>

          <div className="org-sidebar-section">
            <div className="org-sidebar-title">Nivo</div>
            {levelCategories.map(([level, count]) => (
              <div key={level} className="org-sidebar-item">
                <span>{level}</span>
                <span className="org-sidebar-count">{count}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <div className="org-main">
          {/* Featured */}
          {featured && (
            <Link href={`/organizacije/${featured.slug}`} className="org-featured">
              <div className="org-featured-logo">
                {featured.logo ? (
                  <img src={featured.logo} alt={featured.name} />
                ) : (
                  SPORT_EMOJI[featured.sport] || '\uD83C\uDFDB\uFE0F'
                )}
              </div>
              <div className="org-featured-body">
                <div className="org-featured-name">{featured.name}</div>
                <span className={`org-type-badge ${getTypeBadgeClass(featured.type)}`}>
                  {featured.type}
                </span>
                {featured.description && (
                  <div className="org-featured-desc">
                    {featured.description.length > 200
                      ? featured.description.slice(0, 200) + '...'
                      : featured.description}
                  </div>
                )}
                <div className="org-featured-stats">
                  {featured.founded && <span>Osnovano: <strong>{featured.founded}</strong></span>}
                  {featured.city && <span>Grad: <strong>{featured.city}</strong></span>}
                </div>
              </div>
            </Link>
          )}

          {/* Grid */}
          {regular.length > 0 ? (
            <div className="org-grid">
              {regular.map((o) => (
                <Link key={o.id} href={`/organizacije/${o.slug}`} className="org-card">
                  <div className="org-card-top">
                    <div className="org-card-logo">
                      {o.logo ? (
                        <img src={o.logo} alt={o.name} />
                      ) : (
                        SPORT_EMOJI[o.sport] || '\uD83C\uDFDB\uFE0F'
                      )}
                    </div>
                    <div>
                      <div className="org-card-name">{o.nameShort || o.name}</div>
                      <div className="org-card-sub">{o.city}{o.entity ? ` \u00b7 ${o.entity}` : ''}</div>
                    </div>
                  </div>
                  <div className="org-card-tags">
                    <span className={`org-type-badge ${getTypeBadgeClass(o.type)}`}>{o.type}</span>
                    <span className="org-type-badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#999' }}>
                      {o.sport}
                    </span>
                  </div>
                  <div className="org-card-meta">
                    {o.founded && <span>Osn. <strong>{o.founded}</strong></span>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="org-empty">
              <div className="org-empty-icon">{'\uD83D\uDD0D'}</div>
              <div className="org-empty-title">Nema rezultata</div>
              <p style={{ color: '#666', marginTop: 8 }}>Pokušajte sa drugačijim filterima.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
