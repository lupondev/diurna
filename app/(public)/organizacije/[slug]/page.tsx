import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import '../organizacije.css'
import '../../legende/legende.css'

export const revalidate = 3600

interface OrgStats {
  members?: number
  clubs?: number
  titles?: number
  competitions?: number
}

interface Achievement {
  year: number
  title: string
}

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

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const site = await getDefaultSite()
  if (!site) return {}

  const org = await prisma.sportOrganization.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
    select: { name: true, metaTitle: true, metaDescription: true, description: true },
  })

  if (!org) return {}

  return {
    title: org.metaTitle || org.name,
    description: org.metaDescription || org.description?.slice(0, 160) || `Informacije o organizaciji ${org.name}`,
  }
}

export default async function OrganizationDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const site = await getDefaultSite()
  if (!site) notFound()

  const org = await prisma.sportOrganization.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
  })

  if (!org || org.deletedAt || org.status !== 'published') notFound()

  const stats = org.stats as unknown as OrgStats | null
  const achievements = (org.achievements as unknown as Achievement[]) || []
  const emoji = SPORT_EMOJI[org.sport] || '\uD83C\uDFDB\uFE0F'

  // Related orgs (same sport, exclude self)
  const related = await prisma.sportOrganization.findMany({
    where: {
      siteId: site.id,
      sport: org.sport,
      status: 'published',
      deletedAt: null,
      id: { not: org.id },
    },
    select: { name: true, nameShort: true, slug: true, type: true, city: true, logo: true, sport: true },
    take: 6,
  })

  return (
    <div className="org-page">
      <div className="org-detail">
        {/* Hero */}
        <div className="org-detail-hero">
          <div className="org-detail-logo">
            {org.logo ? (
              <img src={org.logo} alt={org.name} />
            ) : (
              emoji
            )}
          </div>
          <div>
            <h1 className="org-detail-name">{org.name}</h1>
            <div className="org-detail-meta">
              <span className={`org-type-badge ${getTypeBadgeClass(org.type)}`}>{org.type}</span>
              <span className="org-type-badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#999' }}>
                {org.sport}
              </span>
              {org.city && (
                <span style={{ fontSize: 13, color: '#999' }}>{org.city}{org.entity ? ` \u00b7 ${org.entity}` : ''}</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        {(org.founded || stats) && (
          <div className="org-detail-section">
            <h2>Podaci</h2>
            <div className="org-detail-stats-grid">
              {org.founded && (
                <div className="org-detail-stat">
                  <div className="org-detail-stat-value">{org.founded}</div>
                  <div className="org-detail-stat-label">Osnovano</div>
                </div>
              )}
              {stats?.members != null && (
                <div className="org-detail-stat">
                  <div className="org-detail-stat-value">{stats.members.toLocaleString()}</div>
                  <div className="org-detail-stat-label">Članova</div>
                </div>
              )}
              {stats?.clubs != null && (
                <div className="org-detail-stat">
                  <div className="org-detail-stat-value">{stats.clubs}</div>
                  <div className="org-detail-stat-label">Klubova</div>
                </div>
              )}
              {stats?.titles != null && (
                <div className="org-detail-stat">
                  <div className="org-detail-stat-value">{stats.titles}</div>
                  <div className="org-detail-stat-label">Titula</div>
                </div>
              )}
              {stats?.competitions != null && (
                <div className="org-detail-stat">
                  <div className="org-detail-stat-value">{stats.competitions}</div>
                  <div className="org-detail-stat-label">Takmičenja</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* About */}
        {org.description && (
          <div className="org-detail-section">
            <h2>O organizaciji</h2>
            <div className="org-detail-text">
              {org.description.split('\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {org.history && (
          <div className="org-detail-section">
            <h2>Historija</h2>
            <div className="org-detail-text">
              {org.history.split('\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="org-detail-section">
            <h2>Uspjesi</h2>
            <div className="ath-timeline">
              {achievements.map((a, i) => (
                <div key={i} className="ath-tl-item ath-tl-item--highlight">
                  <div className="ath-tl-year">{a.year}</div>
                  <div className="ath-tl-event">{a.title}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {(org.website || org.email || org.address) && (
          <div className="org-detail-section">
            <h2>Kontakt</h2>
            <div className="org-detail-contact">
              {org.website && <a href={org.website} target="_blank" rel="noopener noreferrer">{org.website}</a>}
              {org.email && <a href={`mailto:${org.email}`}>{org.email}</a>}
              {org.address && <span style={{ color: '#999', fontSize: 14 }}>{org.address}</span>}
            </div>
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div className="org-detail-section">
            <h2>Povezane organizacije</h2>
            <div className="org-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {related.map((r) => (
                <Link key={r.slug} href={`/organizacije/${r.slug}`} className="org-card">
                  <div className="org-card-top">
                    <div className="org-card-logo">
                      {r.logo ? <img src={r.logo} alt={r.name} /> : (SPORT_EMOJI[r.sport] || '\uD83C\uDFDB\uFE0F')}
                    </div>
                    <div>
                      <div className="org-card-name">{r.nameShort || r.name}</div>
                      <div className="org-card-sub">{r.city || ''}</div>
                    </div>
                  </div>
                  <div className="org-card-tags">
                    <span className={`org-type-badge ${getTypeBadgeClass(r.type)}`}>{r.type}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link href="/organizacije" style={{ color: '#e8ff00', fontSize: 14, textDecoration: 'none' }}>
            &larr; Sve organizacije
          </Link>
        </div>
      </div>
    </div>
  )
}
