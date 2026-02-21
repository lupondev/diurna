import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import { getArticleUrl } from '@/lib/article-url'
import { AdSlot } from '@/components/public/sportba'
import '../category.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const site = await getDefaultSite()
  const siteName = site?.name || 'Diurna'
  return {
    title: `Aktuelno — ${siteName}`,
    description: 'Najnovije aktuelne vijesti i dešavanja.',
  }
}

const GRADIENTS = [
  'linear-gradient(135deg,#1a1a2e,#0f3460)',
  'linear-gradient(135deg,#1e3a5f,#0d1b2a)',
  'linear-gradient(135deg,#1b4332,#081c15)',
  'linear-gradient(135deg,#2d2d00,#141400)',
  'linear-gradient(135deg,#3b0a0a,#1a0404)',
  'linear-gradient(135deg,#0d2818,#051208)',
  'linear-gradient(135deg,#1a1a2e,#0a0a14)',
  'linear-gradient(135deg,#2d1b69,#11052c)',
]

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export default async function AktuelnoPage() {
  const site = await getDefaultSite()
  let dbArticles: { slug: string; title: string; time: string; league: string; bg: string; href: string }[] = []

  if (site) {
    const articles = await prisma.article.findMany({
      where: {
        siteId: site.id,
        status: 'PUBLISHED',
        deletedAt: null,
        isTest: false,
        category: { slug: 'aktuelno' },
      },
      include: {
        category: { select: { name: true, slug: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    })

    dbArticles = articles.map((a, i) => ({
      slug: a.slug,
      title: a.title,
      time: a.publishedAt ? timeAgo(a.publishedAt) : 'Novo',
      league: a.category?.name || 'Aktuelno',
      bg: GRADIENTS[i % GRADIENTS.length],
      href: getArticleUrl(a),
    }))
  }

  const featured = dbArticles[0]
  const grid = dbArticles.slice(1)

  return (
    <main className="sba-cat">
      <div className="sba-cat-header">
        <h1 className="sba-cat-title">Aktuelno</h1>
        <p className="sba-cat-desc">Najnovije aktuelne vijesti i dešavanja</p>
      </div>

      <div className="sba-cat-layout">
        <div className="sba-cat-main">
          {dbArticles.length === 0 && (
            <p style={{ color: 'var(--sba-muted)', padding: '2rem 0' }}>Trenutno nema objavljenih vijesti u ovoj kategoriji.</p>
          )}
          {featured && (
            <Link href={featured.href} className="sba-cat-featured">
              <div className="sba-cat-featured-bg" style={{ background: featured.bg }} />
              <div className="sba-cat-featured-content">
                <span className="sba-cat-badge">Aktuelno</span>
                <h2 className="sba-cat-featured-title">{featured.title}</h2>
                <span className="sba-cat-featured-meta">{featured.time} · {featured.league}</span>
              </div>
            </Link>
          )}

          <div className="sba-cat-grid">
            {grid.map((a) => (
              <Link key={a.slug} href={a.href} className="sba-cat-card">
                <div className="sba-cat-card-thumb">
                  <div className="sba-cat-card-thumb-bg" style={{ background: a.bg }} />
                </div>
                <div className="sba-cat-card-body">
                  <span className="sba-cat-card-title">{a.title}</span>
                  <span className="sba-cat-card-meta">{a.time} · {a.league}</span>
                </div>
              </Link>
            ))}
          </div>

          <AdSlot variant="rectangle" />
        </div>

        <aside className="sba-cat-rail">
          <AdSlot variant="skyscraper" />
        </aside>
      </div>
    </main>
  )
}
