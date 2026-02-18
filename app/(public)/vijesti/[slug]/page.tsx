import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import { tiptapToHtml } from '@/lib/tiptap-html'
import { ArticleRenderer } from '@/components/public/article-renderer'
import { AdSlot } from '@/components/public/sportba'
import {
  ReadingProgress,
  ScrollDepthTracker,
  FloatingShareBar,
  BackToTop,
} from '@/components/public/sportba/article-widgets'
import { MetaBar } from '@/components/public/sportba/meta-bar'
import { Reactions } from '@/components/public/sportba/reactions'
import { NewsletterForm } from '@/components/public/sportba/newsletter-form'
import '../article.css'
import '@/app/site/public.css'

export const dynamic = 'force-dynamic'

type Props = {
  params: { slug: string }
}

/* ═══════════════════════════════════════════════════
   DB Article Fetch
   ═══════════════════════════════════════════════════ */

async function getArticleFromDb(slug: string) {
  const site = await getDefaultSite()
  if (!site) return null

  const article = await prisma.article.findFirst({
    where: {
      siteId: site.id,
      slug,
      status: 'PUBLISHED',
      deletedAt: null,
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      tags: { include: { tag: true } },
    },
  })

  if (!article) return null

  let authorName = 'Redakcija Sport.ba'
  if (article.authorId) {
    const author = await prisma.user.findUnique({
      where: { id: article.authorId },
      select: { name: true },
    })
    if (author?.name) authorName = author.name
  }

  // Fetch related articles from same category
  const related = await prisma.article.findMany({
    where: {
      siteId: site.id,
      categoryId: article.categoryId,
      status: 'PUBLISHED',
      deletedAt: null,
      id: { not: article.id },
    },
    select: { title: true, slug: true, category: { select: { slug: true, name: true } }, publishedAt: true },
    orderBy: { publishedAt: 'desc' },
    take: 3,
  })

  // Fetch trending (most recent published)
  const trending = await prisma.article.findMany({
    where: {
      siteId: site.id,
      status: 'PUBLISHED',
      deletedAt: null,
      id: { not: article.id },
    },
    select: { title: true, slug: true, category: { select: { slug: true, name: true } }, publishedAt: true },
    orderBy: { publishedAt: 'desc' },
    take: 5,
  })

  return { article, authorName, related, trending, site }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('bs-BA', { day: 'numeric', month: 'long', year: 'numeric' }).format(date) + '.'
}

/* ═══════════════════════════════════════════════════
   Demo Fallback Data (Arsenal article)
   ═══════════════════════════════════════════════════ */

const DEMO_ARTICLE = {
  slug: 'arsenal-liga-prvaka-pohod-2025',
  category: 'Vijesti',
  title: 'Arsenal na pragu historije \u2014 pohod ka prvom naslovu u Ligi prvaka',
  subtitle: 'Arteta je izgradio tim koji ne samo da dominira Premijer ligom, već sada ozbiljno prijeti i na evropskoj sceni. Arsenal u nokaut fazi Lige prvaka izgleda neustrašivo.',
  author: 'Emir Hadžić',
  date: '15. februar 2026.',
  isoDate: '2026-02-15T10:00:00+01:00',
  views: '24.8K',
  featuredBg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  featuredCaption: 'Arsenal slavi nakon pobjede na Emirates Stadionu \u00b7 Getty Images',
  body: `Arsenalova sezona 2025/26 polako ali sigurno ulazi u historijske knjige. Tim koji je Mikel Arteta strpljivo gradio tokom posljednjih pet godina sada izgleda spreman za najveći trofej u klupskom fudbalu \u2014 naslov prvaka Lige prvaka.

Sa rekordom od 18 pobjeda, 4 remija i samo 2 poraza u Premijer ligi, Gunnersi su na čelu tabele i igraju fudbal koji podsjeća na najveće evropske timove. Ali ono što posebno impresionira jeste njihova forma u Ligi prvaka.

Grupnu fazu su prošli kao prvi u grupi sa pet pobjeda i jednim remijem, postigavši 16 golova uz samo 3 primljena. Odbrana predvođena Williamom Salibom i Gabrijelom postala je najčvršća na kontinentu, dok je vezni red sa Deculanom Riceom i Martinom \u00D8degaardom pronašao savršeni balans između kreativnosti i čvrstoće.

Ono što Artetu izdvaja od prethodnih Arsenal menadžera je njegova taktička fleksibilnost. Tim može igrati sa visokim pritiskom poput Klopovog Liverpoola, ali se jednako lako može povući u organiziran blok i napadati iz kontranapada. Ova sposobnost prilagodbe bit će ključna u nokaut fazi.

U osmini finala čeka ih okršaj sa Interom, timom koji je prošle sezone stigao do polufinala. Italijanski prvak neće biti lak protivnik, ali Arsenal ima kvalitet i dubinu kadra za prolaz. Bukayo Saka, koji je ove sezone postigao 14 golova i dodao 11 asistencija u svim takmičenjima, bit će ključni igrač.

Navijači na Emirates Stadionu osjećaju da je ovo njihova godina. Atmosfera na domaćim utakmicama Lige prvaka bila je električna, sa punim stadionom koji skandira "We\u2019ve got super Mik Arteta" nakon svake pobjede. Klub je takođe značajno investirao u pojačanja \u2014 dolazak Joaa Nevesa iz Benfice za 85 miliona eura pojačao je sredinu terena.

Naravno, put do finala je dug i nepredvidiv. Bayern München, Real Madrid i Manchester City su i dalje u takmičenju i svaki od ovih timova može eliminisati Gunners. Međutim, ono što Arsenal ima, a što mnogim favoritima nedostaje, jeste glad za trofejom.

Posljednji put kada je Arsenal igrao finale Lige prvaka bilo je 2006. godine u Parizu, kada su izgubili od Barcelone. Dvadeset godina kasnije, Arteta i njegovi igrači žele prepisati tu priču. Sa trenutnom formom i mentalitetom, ne bi bilo iznenađenje ako Arsenal podigne trofej u maju.`,
  tags: ['Arsenal', 'Liga prvaka', 'Mikel Arteta', 'Premijer liga', 'Bukayo Saka', 'William Saliba'],
}

const DEMO_RELATED = [
  { cat: 'VIJESTI', title: 'Guardiola priznaje: Arsenal je najbolji tim u Engleskoj', meta: '3h \u00b7 Premijer liga', bg: 'linear-gradient(135deg, #1e3a5f, #0d1b2a)' },
  { cat: 'TRANSFERI', title: 'Arsenal cilja pojačanje u napadu \u2014 Osimhen na radaru', meta: '5h \u00b7 Transferi', bg: 'linear-gradient(135deg, #3d1f00, #1a0d00)' },
  { cat: 'UTAKMICE', title: 'Arsenal \u2013 Inter: Najava utakmice osmine finala Lige prvaka', meta: '8h \u00b7 Liga prvaka', bg: 'linear-gradient(135deg, #0d2818, #051208)' },
]

const DEMO_TRENDING = [
  { title: 'Haaland hat-trick protiv Arsenala', meta: 'Vijesti \u00b7 2h' },
  { title: 'El Cl\u00e1sico pripreme bez Mbapp\u00e9a', meta: 'Utakmice \u00b7 4h' },
  { title: 'Transfer Wirtza u Barcelonu', meta: 'Transferi \u00b7 5h' },
  { title: 'VAR kontroverza u Premijer ligi', meta: 'Vijesti \u00b7 6h' },
  { title: 'Conte vs Juventus \u2014 najava utakmice', meta: 'Utakmice \u00b7 8h' },
]

/* ═══════════════════════════════════════════════════
   Metadata
   ═══════════════════════════════════════════════════ */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await getArticleFromDb(params.slug)
  if (result) {
    const { article } = result
    return {
      title: `${article.metaTitle || article.title} \u2014 Sport.ba`,
      description: article.metaDescription || article.excerpt || undefined,
      openGraph: {
        title: article.metaTitle || article.title,
        description: article.metaDescription || article.excerpt || undefined,
        type: 'article',
      },
    }
  }
  // Fallback to demo
  return {
    title: `${DEMO_ARTICLE.title} \u2014 Sport.ba`,
    description: DEMO_ARTICLE.subtitle,
  }
}

/* ═══════════════════════════════════════════════════
   Page Component
   ═══════════════════════════════════════════════════ */

export default async function ArticlePage({ params }: Props) {
  const result = await getArticleFromDb(params.slug)

  if (result) {
    return <DbArticle data={result} />
  }

  // Fallback: demo article (only for the known demo slug)
  if (params.slug !== DEMO_ARTICLE.slug) {
    notFound()
  }
  return <DemoArticle />
}

/* ═══════════════════════════════════════════════════
   DB Article Renderer (real articles)
   ═══════════════════════════════════════════════════ */

function DbArticle({ data }: { data: NonNullable<Awaited<ReturnType<typeof getArticleFromDb>>> }) {
  const { article, authorName, related, trending } = data
  const bodyHtml = tiptapToHtml(article.content)
  const wordCount = bodyHtml.replace(/<[^>]*>/g, '').split(/\s+/).length
  const readTime = Math.max(1, Math.round(wordCount / 200))
  const categoryName = article.category?.name || 'Vijesti'
  const categorySlug = article.category?.slug || 'vijesti'
  const pubDate = article.publishedAt || article.createdAt

  return (
    <main className="sba-article">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: article.title,
            description: article.metaDescription || article.excerpt || '',
            datePublished: pubDate.toISOString(),
            dateModified: article.updatedAt.toISOString(),
            author: { '@type': 'Person', name: authorName },
            publisher: { '@type': 'Organization', name: 'Sport.ba' },
            articleSection: categoryName,
          }),
        }}
      />
      <ReadingProgress />
      <ScrollDepthTracker />

      <div className="sba-article-leaderboard">
        <AdSlot variant="leaderboard" />
      </div>

      <div className="sba-article-layout">
        <article className="sba-article-main">
          {/* Breadcrumb */}
          <nav className="sba-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Početna</Link>
            <span className="sba-breadcrumb-sep">/</span>
            <Link href={`/${categorySlug}`}>{categoryName}</Link>
            <span className="sba-breadcrumb-sep">/</span>
            <span className="sba-breadcrumb-current">Članak</span>
          </nav>

          <span className="sba-article-cat">{categoryName}</span>
          <h1 className="sba-article-title">{article.title}</h1>

          {article.excerpt && (
            <p className="sba-article-subtitle">{article.excerpt}</p>
          )}

          <MetaBar
            author={authorName}
            date={formatDate(pubDate)}
            readTime={readTime}
            views=""
          />

          {/* Featured Image placeholder */}
          <div className="sba-featured-img">
            <div
              className="sba-featured-img-bg"
              style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
            />
          </div>

          {/* Article Body with Widget Rendering */}
          <div className="sba-article-body">
            <ArticleRenderer html={bodyHtml} />
          </div>

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="sba-article-tags">
              {article.tags.map(({ tag }) => (
                <Link key={tag.id} href={`/${categorySlug}`} className="sba-tag">
                  {tag.name}
                </Link>
              ))}
            </div>
          )}

          <Reactions />

          {/* Related Articles */}
          {related.length > 0 && (
            <section className="sba-related">
              <div className="sba-section-head">
                <h2 className="sba-section-title">Povezani članci</h2>
              </div>
              <div className="sba-related-grid">
                {related.map((r) => (
                  <Link key={r.slug} href={`/${r.category?.slug || 'vijesti'}/${r.slug}`} className="sba-related-card">
                    <div className="sba-related-card-img">
                      <div
                        className="sba-related-card-img-bg"
                        style={{ background: 'linear-gradient(135deg, #1e3a5f, #0d1b2a)' }}
                      />
                    </div>
                    <div className="sba-related-card-body">
                      <span className="sba-related-card-cat">{r.category?.name?.toUpperCase() || 'VIJESTI'}</span>
                      <span className="sba-related-card-title">{r.title}</span>
                      {r.publishedAt && (
                        <span className="sba-related-card-meta">{timeAgo(r.publishedAt)}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="sba-article-native-ad">
            <AdSlot variant="native" />
          </div>
        </article>

        {/* Sidebar */}
        <aside className="sba-article-sidebar">
          <div className="sba-sidebar-sticky">
            <AdSlot variant="rectangle" />

            {trending.length > 0 && (
              <div className="sba-rail-card">
                <div className="sba-rail-head">U trendu</div>
                <div className="sba-trending-list">
                  {trending.map((t, i) => (
                    <Link key={t.slug} href={`/${t.category?.slug || 'vijesti'}/${t.slug}`} className="sba-trending-item">
                      <span className="sba-trending-rank">{i + 1}</span>
                      <div className="sba-trending-body">
                        <span className="sba-trending-title">{t.title}</span>
                        <span className="sba-trending-meta">
                          {t.category?.name || 'Vijesti'} {t.publishedAt ? `\u00b7 ${timeAgo(t.publishedAt)}` : ''}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {trending.length === 0 && (
              <div className="sba-rail-card">
                <div className="sba-rail-head">U trendu</div>
                <div className="sba-trending-list">
                  {DEMO_TRENDING.map((t, i) => (
                    <Link key={i} href="/vijesti" className="sba-trending-item">
                      <span className="sba-trending-rank">{i + 1}</span>
                      <div className="sba-trending-body">
                        <span className="sba-trending-title">{t.title}</span>
                        <span className="sba-trending-meta">{t.meta}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <NewsletterForm />
          </div>
        </aside>
      </div>

      <div className="sba-article-prefooter">
        <AdSlot variant="leaderboard" />
      </div>

      <FloatingShareBar />
      <BackToTop />
    </main>
  )
}

/* ═══════════════════════════════════════════════════
   Demo Article (fallback for known demo slugs)
   ═══════════════════════════════════════════════════ */

function DemoArticle() {
  const paragraphs = DEMO_ARTICLE.body.split('\n\n')
  const wordCount = DEMO_ARTICLE.body.split(/\s+/).length
  const readTime = Math.max(1, Math.round(wordCount / 200))

  return (
    <main className="sba-article">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: DEMO_ARTICLE.title,
            description: DEMO_ARTICLE.subtitle,
            datePublished: DEMO_ARTICLE.isoDate,
            author: { '@type': 'Person', name: DEMO_ARTICLE.author },
            publisher: { '@type': 'Organization', name: 'Sport.ba' },
            articleSection: DEMO_ARTICLE.category,
            keywords: DEMO_ARTICLE.tags.join(', '),
          }),
        }}
      />
      <ReadingProgress />
      <ScrollDepthTracker />

      <div className="sba-article-leaderboard">
        <AdSlot variant="leaderboard" />
      </div>

      <div className="sba-article-layout">
        <article className="sba-article-main">
          <nav className="sba-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Početna</Link>
            <span className="sba-breadcrumb-sep">/</span>
            <Link href="/vijesti">Vijesti</Link>
            <span className="sba-breadcrumb-sep">/</span>
            <span className="sba-breadcrumb-current">Članak</span>
          </nav>

          <span className="sba-article-cat">{DEMO_ARTICLE.category}</span>
          <h1 className="sba-article-title">{DEMO_ARTICLE.title}</h1>
          <p className="sba-article-subtitle">{DEMO_ARTICLE.subtitle}</p>

          <MetaBar
            author={DEMO_ARTICLE.author}
            date={DEMO_ARTICLE.date}
            readTime={readTime}
            views={DEMO_ARTICLE.views}
          />

          <div className="sba-featured-img">
            <div className="sba-featured-img-bg" style={{ background: DEMO_ARTICLE.featuredBg }} />
            <div className="sba-featured-img-caption">{DEMO_ARTICLE.featuredCaption}</div>
          </div>

          <div className="sba-article-body">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="sba-article-tags">
            {DEMO_ARTICLE.tags.map((tag) => (
              <Link key={tag} href="/vijesti" className="sba-tag">{tag}</Link>
            ))}
          </div>

          <Reactions />

          <section className="sba-related">
            <div className="sba-section-head">
              <h2 className="sba-section-title">Povezani članci</h2>
            </div>
            <div className="sba-related-grid">
              {DEMO_RELATED.map((r, i) => (
                <Link key={i} href="/vijesti" className="sba-related-card">
                  <div className="sba-related-card-img">
                    <div className="sba-related-card-img-bg" style={{ background: r.bg }} />
                  </div>
                  <div className="sba-related-card-body">
                    <span className="sba-related-card-cat">{r.cat}</span>
                    <span className="sba-related-card-title">{r.title}</span>
                    <span className="sba-related-card-meta">{r.meta}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <div className="sba-article-native-ad">
            <AdSlot variant="native" />
          </div>
        </article>

        <aside className="sba-article-sidebar">
          <div className="sba-sidebar-sticky">
            <AdSlot variant="rectangle" />
            <div className="sba-rail-card">
              <div className="sba-rail-head">U trendu</div>
              <div className="sba-trending-list">
                {DEMO_TRENDING.map((t, i) => (
                  <Link key={i} href="/vijesti" className="sba-trending-item">
                    <span className="sba-trending-rank">{i + 1}</span>
                    <div className="sba-trending-body">
                      <span className="sba-trending-title">{t.title}</span>
                      <span className="sba-trending-meta">{t.meta}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <NewsletterForm />
          </div>
        </aside>
      </div>

      <div className="sba-article-prefooter">
        <AdSlot variant="leaderboard" />
      </div>

      <FloatingShareBar />
      <BackToTop />
    </main>
  )
}
