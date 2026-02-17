import Link from 'next/link'
import type { Metadata } from 'next'
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

/* ── Demo Article Data ── */

const ARTICLE = {
  slug: 'arsenal-liga-prvaka-pohod-2025',
  category: 'Vijesti',
  title:
    'Arsenal na pragu historije \u2014 pohod ka prvom naslovu u Ligi prvaka',
  subtitle:
    'Arteta je izgradio tim koji ne samo da dominira Premijer ligom, već sada ozbiljno prijeti i na evropskoj sceni. Arsenal u nokaut fazi Lige prvaka izgleda neustrašivo.',
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
  tags: [
    'Arsenal',
    'Liga prvaka',
    'Mikel Arteta',
    'Premijer liga',
    'Bukayo Saka',
    'William Saliba',
  ],
  contextTimeline: [
    { year: '2006', text: 'Posljednje finale Arsenala u Ligi prvaka \u2014 poraz od Barcelone u Parizu' },
    { year: '2020', text: 'Arteta preuzima Arsenal \u2014 počinje era transformacije' },
    { year: '2023', text: 'Arsenal se vraća u Ligu prvaka nakon šest godina pauze' },
    { year: '2025', text: 'Prva titula Premijer lige pod Artetom' },
    { year: '2026', text: 'Pohod na duplu krunu \u2014 Liga prvaka i Premijer liga' },
  ],
  inlineRelated: {
    title: 'Saka postigao hat-trick \u2014 Arsenal deklasirao Chelsea 4:1 u londonskom derbiju',
    href: '/vijesti',
  },
}

const RELATED = [
  {
    cat: 'VIJESTI',
    title: 'Guardiola priznaje: Arsenal je najbolji tim u Engleskoj',
    meta: '3h \u00b7 Premijer liga',
    bg: 'linear-gradient(135deg, #1e3a5f, #0d1b2a)',
  },
  {
    cat: 'TRANSFERI',
    title: 'Arsenal cilja pojačanje u napadu \u2014 Osimhen na radaru',
    meta: '5h \u00b7 Transferi',
    bg: 'linear-gradient(135deg, #3d1f00, #1a0d00)',
  },
  {
    cat: 'UTAKMICE',
    title: 'Arsenal \u2013 Inter: Najava utakmice osmine finala Lige prvaka',
    meta: '8h \u00b7 Liga prvaka',
    bg: 'linear-gradient(135deg, #0d2818, #051208)',
  },
]

const TRENDING = [
  { title: 'Haaland hat-trick protiv Arsenala', meta: 'Vijesti \u00b7 2h' },
  { title: 'El Cl\u00e1sico pripreme bez Mbapp\u00e9a', meta: 'Utakmice \u00b7 4h' },
  { title: 'Transfer Wirtza u Barcelonu', meta: 'Transferi \u00b7 5h' },
  {
    title: 'VAR kontroverza u Premijer ligi',
    meta: 'Vijesti \u00b7 6h',
  },
  {
    title: 'Conte vs Juventus \u2014 najava utakmice',
    meta: 'Utakmice \u00b7 8h',
  },
]

/* ── Metadata ── */

const wordCount = ARTICLE.body.split(/\s+/).length
const readTime = Math.max(1, Math.round(wordCount / 200))

export const metadata: Metadata = {
  title: `${ARTICLE.title} \u2014 Sport.ba`,
  description: ARTICLE.subtitle,
}

/* ── JSON-LD Schemas ── */

function JsonLd() {
  const newsArticle = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: ARTICLE.title,
    description: ARTICLE.subtitle,
    image: [],
    datePublished: ARTICLE.isoDate,
    dateModified: ARTICLE.isoDate,
    author: {
      '@type': 'Person',
      name: ARTICLE.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Sport.ba',
      logo: {
        '@type': 'ImageObject',
        url: 'https://sport.ba/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://sport.ba/vijesti/${ARTICLE.slug}`,
    },
    wordCount,
    articleSection: ARTICLE.category,
    keywords: ARTICLE.tags.join(', '),
  }

  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Početna',
        item: 'https://sport.ba',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Vijesti',
        item: 'https://sport.ba/vijesti',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: ARTICLE.title,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticle) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbList) }}
      />
    </>
  )
}

/* ── Page Component ── */

export default function ArticlePage() {
  /* Split body into paragraphs for depth markers */
  const paragraphs = ARTICLE.body.split('\n\n')
  const total = paragraphs.length
  const depthAt25 = Math.floor(total * 0.25)
  const depthAt50 = Math.floor(total * 0.5)
  const depthAt75 = Math.floor(total * 0.75)

  return (
    <main className="sba-article">
      <JsonLd />
      <ReadingProgress />
      <ScrollDepthTracker />

      {/* ── Leaderboard Ad ── */}
      <div className="sba-article-leaderboard">
        <AdSlot variant="leaderboard" />
      </div>

      <div className="sba-article-layout">
        {/* ══════════ ARTICLE COLUMN ══════════ */}
        <article className="sba-article-main">
          {/* ── Breadcrumb ── */}
          <nav className="sba-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Početna</Link>
            <span className="sba-breadcrumb-sep">/</span>
            <Link href="/vijesti">Vijesti</Link>
            <span className="sba-breadcrumb-sep">/</span>
            <span className="sba-breadcrumb-current">Članak</span>
          </nav>

          {/* ── Category Badge ── */}
          <span className="sba-article-cat">{ARTICLE.category}</span>

          {/* ── Title ── */}
          <h1 className="sba-article-title">{ARTICLE.title}</h1>

          {/* ── Subtitle ── */}
          <p className="sba-article-subtitle">{ARTICLE.subtitle}</p>

          {/* ── Meta Bar ── */}
          <MetaBar
            author={ARTICLE.author}
            date={ARTICLE.date}
            readTime={readTime}
            views={ARTICLE.views}
          />

          {/* ── Featured Image ── */}
          <div className="sba-featured-img">
            <div
              className="sba-featured-img-bg"
              style={{ background: ARTICLE.featuredBg }}
            />
            <div className="sba-featured-img-caption">
              {ARTICLE.featuredCaption}
            </div>
          </div>

          {/* ── Article Body ── */}
          <div className="sba-article-body">
            {paragraphs.map((p, i) => (
              <div key={i}>
                <p>{p}</p>

                {/* Depth markers */}
                {i === depthAt25 && (
                  <span className="sba-depth-marker" data-depth="25" />
                )}
                {i === depthAt50 && (
                  <span className="sba-depth-marker" data-depth="50" />
                )}
                {i === depthAt75 && (
                  <span className="sba-depth-marker" data-depth="75" />
                )}

                {/* Context Box after 2nd paragraph */}
                {i === 1 && (
                  <aside className="sba-context-box">
                    <div className="sba-context-box-head">
                      Arsenalova historija u Ligi prvaka
                    </div>
                    <div className="sba-context-timeline">
                      {ARTICLE.contextTimeline.map((item) => (
                        <div key={item.year} className="sba-timeline-item">
                          <span className="sba-timeline-dot" />
                          <span className="sba-timeline-year">{item.year}</span>
                          <span className="sba-timeline-text">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </aside>
                )}

                {/* Inline Related after 4th paragraph */}
                {i === 3 && (
                  <Link
                    href={ARTICLE.inlineRelated.href}
                    className="sba-inline-related"
                  >
                    <span className="sba-inline-related-label">
                      Povezano
                    </span>
                    <span className="sba-inline-related-title">
                      {ARTICLE.inlineRelated.title}
                    </span>
                  </Link>
                )}

                {/* Mid-article Ad after 5th paragraph */}
                {i === 4 && (
                  <div className="sba-article-mid-ad">
                    <AdSlot variant="rectangle" />
                  </div>
                )}
              </div>
            ))}

            {/* Final depth marker */}
            <span className="sba-depth-marker" data-depth="100" />
          </div>

          {/* ── Tags ── */}
          <div className="sba-article-tags">
            {ARTICLE.tags.map((tag) => (
              <Link key={tag} href="/vijesti" className="sba-tag">
                {tag}
              </Link>
            ))}
          </div>

          {/* ── Reactions ── */}
          <Reactions />

          {/* ── Related Articles ── */}
          <section className="sba-related">
            <div className="sba-section-head">
              <h2 className="sba-section-title">Povezani članci</h2>
            </div>
            <div className="sba-related-grid">
              {RELATED.map((r, i) => (
                <Link key={i} href="/vijesti" className="sba-related-card">
                  <div className="sba-related-card-img">
                    <div
                      className="sba-related-card-img-bg"
                      style={{ background: r.bg }}
                    />
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

          {/* ── Native Ad ── */}
          <div className="sba-article-native-ad">
            <AdSlot variant="native" />
          </div>
        </article>

        {/* ══════════ SIDEBAR ══════════ */}
        <aside className="sba-article-sidebar">
          <div className="sba-sidebar-sticky">
            {/* 300x250 Ad */}
            <AdSlot variant="rectangle" />

            {/* Trending */}
            <div className="sba-rail-card">
              <div className="sba-rail-head">U trendu</div>
              <div className="sba-trending-list">
                {TRENDING.map((t, i) => (
                  <Link
                    key={i}
                    href="/vijesti"
                    className="sba-trending-item"
                  >
                    <span className="sba-trending-rank">{i + 1}</span>
                    <div className="sba-trending-body">
                      <span className="sba-trending-title">{t.title}</span>
                      <span className="sba-trending-meta">{t.meta}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <NewsletterForm />
          </div>
        </aside>
      </div>

      {/* ── Pre-footer Ad ── */}
      <div className="sba-article-prefooter">
        <AdSlot variant="leaderboard" />
      </div>

      {/* ── Floating Elements ── */}
      <FloatingShareBar />
      <BackToTop />
    </main>
  )
}
