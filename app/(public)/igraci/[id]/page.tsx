import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPlayer } from '@/lib/api-football'
import '../../category.css'

export const revalidate = 300

function positionLabel(pos: string | null): string {
  switch (pos) {
    case 'Attacker': return 'Napadač'
    case 'Midfielder': return 'Veznjak'
    case 'Defender': return 'Branič'
    case 'Goalkeeper': return 'Golman'
    default: return pos || '—'
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const player = await getPlayer(Number(id))
  if (!player) return { title: 'Igrač — Diurna' }
  return {
    title: `${player.player.name} — Diurna`,
    description: `Profil i statistike za ${player.player.name}`,
  }
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const player = await getPlayer(Number(id))
  if (!player) notFound()

  const p = player.player
  const stat = player.statistics[0]

  return (
    <main className="sba-cat">
      <style>{`
.sba-player-hero {
  max-width: 1200px; margin: 0 auto; padding: 32px 16px 0;
  display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap;
}
.sba-player-hero-photo {
  width: 120px; height: 120px; border-radius: 50%; object-fit: cover;
  background: var(--sba-bg-2); border: 3px solid var(--sba-border);
}
.sba-player-hero-info { flex: 1; min-width: 200px; }
.sba-player-hero-name {
  font-family: var(--sba-serif); font-size: 28px; font-weight: 700;
  color: var(--sba-text-0); margin: 0 0 8px;
}
.sba-player-hero-meta {
  display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: var(--sba-text-2);
}
.sba-player-hero-meta-item { display: flex; align-items: center; gap: 6px; }
.sba-player-hero-meta-label { font-weight: 600; color: var(--sba-text-3); font-size: 11px; text-transform: uppercase; font-family: var(--sba-mono); }

.sba-player-content { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }

.sba-stats-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 32px;
}
@media (min-width: 540px) { .sba-stats-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 768px) { .sba-stats-grid { grid-template-columns: repeat(4, 1fr); } }

.sba-stat-card {
  background: var(--sba-bg-1); border: 1px solid var(--sba-border);
  border-radius: 10px; padding: 16px; text-align: center;
}
.sba-stat-card-value {
  font-family: var(--sba-mono); font-size: 28px; font-weight: 700; color: var(--sba-text-0);
}
.sba-stat-card-label {
  font-family: var(--sba-mono); font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em; color: var(--sba-text-3); margin-top: 4px;
}

.sba-section-label {
  font-family: var(--sba-mono); font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.1em; color: var(--sba-text-3);
  margin-bottom: 12px;
}

.sba-player-details {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 32px;
}
@media (min-width: 540px) { .sba-player-details { grid-template-columns: repeat(3, 1fr); } }

.sba-detail-item { padding: 12px; background: var(--sba-bg-1); border: 1px solid var(--sba-border); border-radius: 8px; }
.sba-detail-label {
  font-family: var(--sba-mono); font-size: 10px; font-weight: 600;
  text-transform: uppercase; color: var(--sba-text-3); margin-bottom: 4px;
}
.sba-detail-value { font-size: 14px; font-weight: 500; color: var(--sba-text-0); }

.sba-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--sba-mono); font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--sba-text-2); text-decoration: none; margin-bottom: 16px;
}
.sba-back-link:hover { color: var(--sba-accent); }
      `}</style>

      {/* Hero */}
      <div className="sba-player-hero">
        <Image
          src={p.photo}
          alt={p.name}
          width={120}
          height={120}
          className="sba-player-hero-photo"
          unoptimized
        />
        <div className="sba-player-hero-info">
          <h1 className="sba-player-hero-name">{p.name}</h1>
          <div className="sba-player-hero-meta">
            {stat?.team && (
              <span className="sba-player-hero-meta-item">
                {stat.team.logo && <Image src={stat.team.logo} alt="" width={18} height={18} unoptimized />}
                {stat.team.name}
              </span>
            )}
            <span className="sba-player-hero-meta-item">{positionLabel(stat?.games.position ?? null)}</span>
            <span className="sba-player-hero-meta-item">{p.nationality}</span>
            <span className="sba-player-hero-meta-item">{p.age} god.</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="sba-player-content">
        <Link href="/igraci" className="sba-back-link">← Nazad na igrače</Link>

        {/* Season stats */}
        {stat && (
          <>
            <div className="sba-section-label">Sezonska statistika — {stat.league.name}</div>
            <div className="sba-stats-grid">
              <div className="sba-stat-card">
                <div className="sba-stat-card-value">{stat.games.appearances ?? 0}</div>
                <div className="sba-stat-card-label">Utakmice</div>
              </div>
              <div className="sba-stat-card">
                <div className="sba-stat-card-value">{stat.goals.total ?? 0}</div>
                <div className="sba-stat-card-label">Golovi</div>
              </div>
              <div className="sba-stat-card">
                <div className="sba-stat-card-value">{stat.goals.assists ?? 0}</div>
                <div className="sba-stat-card-label">Asistencije</div>
              </div>
              <div className="sba-stat-card">
                <div className="sba-stat-card-value">{stat.games.minutes ?? 0}</div>
                <div className="sba-stat-card-label">Minute</div>
              </div>
              <div className="sba-stat-card">
                <div className="sba-stat-card-value">{stat.shots?.total ?? 0}</div>
                <div className="sba-stat-card-label">Udarci</div>
              </div>
              <div className="sba-stat-card">
                <div className="sba-stat-card-value">{stat.shots?.on ?? 0}</div>
                <div className="sba-stat-card-label">U okvir</div>
              </div>
              <div className="sba-stat-card">
                <div className="sba-stat-card-value">{stat.passes?.accuracy ?? 0}%</div>
                <div className="sba-stat-card-label">Pas. točnost</div>
              </div>
              <div className="sba-stat-card">
                <div className="sba-stat-card-value">
                  {(stat.cards?.yellow ?? 0)}/{(stat.cards?.red ?? 0)}
                </div>
                <div className="sba-stat-card-label">Žuti/Crveni</div>
              </div>
            </div>
          </>
        )}

        {/* Player info */}
        <div className="sba-section-label">Informacije</div>
        <div className="sba-player-details">
          <div className="sba-detail-item">
            <div className="sba-detail-label">Puno ime</div>
            <div className="sba-detail-value">{p.firstname} {p.lastname}</div>
          </div>
          <div className="sba-detail-item">
            <div className="sba-detail-label">Datum rođenja</div>
            <div className="sba-detail-value">{p.birth.date || '—'}</div>
          </div>
          <div className="sba-detail-item">
            <div className="sba-detail-label">Mjesto rođenja</div>
            <div className="sba-detail-value">{p.birth.place || '—'}, {p.birth.country || ''}</div>
          </div>
          <div className="sba-detail-item">
            <div className="sba-detail-label">Nacionalnost</div>
            <div className="sba-detail-value">{p.nationality}</div>
          </div>
          {p.height && (
            <div className="sba-detail-item">
              <div className="sba-detail-label">Visina</div>
              <div className="sba-detail-value">{p.height}</div>
            </div>
          )}
          {p.weight && (
            <div className="sba-detail-item">
              <div className="sba-detail-label">Težina</div>
              <div className="sba-detail-value">{p.weight}</div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
