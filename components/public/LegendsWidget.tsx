import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'

const SPORT_EMOJI: Record<string, string> = {
  fudbal: '\u26BD',
  'košarka': '\uD83C\uDFC0',
  rukomet: '\uD83E\uDD3E',
  atletika: '\uD83C\uDFC3',
  boks: '\uD83E\uDD4A',
  'džudo': '\uD83E\uDD4B',
}

export async function LegendsWidget() {
  const site = await getDefaultSite()
  if (!site) return null

  const legends = await prisma.athlete.findMany({
    where: {
      siteId: site.id,
      status: 'published',
      deletedAt: null,
    },
    select: {
      name: true,
      slug: true,
      sport: true,
      photo: true,
      legendRank: true,
    },
    orderBy: { legendRank: 'asc' },
    take: 3,
  })

  if (legends.length === 0) return null

  return (
    <div className="sba-rail-card">
      <div className="sba-rail-head">BH Legende</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px' }}>
        {legends.map((l) => (
          <Link
            key={l.slug}
            href={`/legende/${l.slug}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 0',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <span style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--sba-bg-2, #14161d)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
              overflow: 'hidden',
            }}>
              {l.photo ? (
                <img src={l.photo} alt={l.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                SPORT_EMOJI[l.sport] || '\uD83C\uDFC5'
              )}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--sba-text-0, #f2f3f7)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {l.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--sba-text-2, #8b8fa3)' }}>
                {l.sport} {l.legendRank ? `\u00b7 #${l.legendRank}` : ''}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Link
        href="/legende"
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '10px 14px',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--sba-accent, #ff5722)',
          textDecoration: 'none',
          borderTop: '1px solid var(--sba-border, #262a38)',
        }}
      >
        Pogledaj sve &rarr;
      </Link>
    </div>
  )
}
