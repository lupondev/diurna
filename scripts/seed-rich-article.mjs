import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ARTICLE_HTML = `<p class="lead">Vinícius Júnior i njegovi saigrači iz Real Madrida bili su spremni da napuste teren, a utakmica je odgođena za 10 minuta nakon što je brazilski napadač navodno bio izložen rasističkim uvredama nakon postizanja gola koji je Real Madridu donio prednost od 1:0 u prvoj utakmici play-off faze Lige prvaka protiv Benfice.</p>

<div data-widget="match" data-home="Benfica" data-away="Real Madrid" data-score="0-1" data-league="Liga Prvaka" data-date="18.02.2026" data-status="FT"></div>

<h2>Incident na Estádio da Luz</h2>

<p>Napadač je proslavio spektakularan pogodak plesom u uglu stadiona Estádio da Luz, a u sukobima koji su uslijedili, igrač Benfice Gianluca Prestianni nešto mu je rekao dok je pokrivao usta rukom. Vinícius je odmah reagovao na incident, jasno pokazujući sudiji da neće tolerisati rasističko ponašanje.</p>

<p>Glavni sudija je prekinuo utakmicu i naredio obje ekipe u svlačionice dok su stadionski zvučnici emitovali poruku protiv rasizma. Nakon pauze od oko 10 minuta, igrači su se vratili na teren i utakmica je nastavljena.</p>

<div data-widget="video" data-url="https://www.youtube.com/embed/ScMzIvxBSi4" data-caption="Vinícius Júnior — Sezona 2025/26 Highlights"></div>

<div data-widget="player-card" data-name="Vinícius Júnior" data-team="Real Madrid" data-position="LW" data-rating="8.2" data-goals="12" data-assists="8" data-market-value="€150M" data-image="https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=400"></div>

<h2>Kontekst: Rasizam u evropskom fudbalu</h2>

<p>Incident na Estádio da Luz predstavlja još jedan slučaj rasizma u evropskom fudbalu, s obzirom na to da je Vinícius Júnior već ranije bio meta sličnih napada tokom svojih nastupa za Real Madrid. Brazilski napadač je u više navrata govorio o problemu rasizma u španskom fudbalu, što je dovelo do nekoliko sudskih procesa i kazni za klubove čiji su navijači bili uključeni.</p>

<p>UEFA je pokrenula disciplinski postupak protiv Benfice u vezi sa incidentom, a predsjednik portugalskog kluba izdao je saopštenje u kojem osuđuje bilo kakav oblik diskriminacije. Real Madrid je objavio podršku svom igraču putem društvenih mreža, a brojni igrači i klubovi širom Evrope pridružili su se osudi rasističkog ponašanja.</p>

<div data-widget="gallery" data-images='[{"url":"https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800","caption":"Estádio da Luz, Lisabon"},{"url":"https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800","caption":"Akcija iz utakmice"},{"url":"https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800","caption":"Navijači na tribinama"},{"url":"https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800","caption":"Slavlje nakon gola"}]'></div>

<h2>Statistika utakmice</h2>

<div data-widget="stats-table" data-title="Benfica vs Real Madrid — Statistika" data-headers='["","Benfica","Real Madrid"]' data-rows='[["Posjed lopte","45%","55%"],["Udarci","12","18"],["Udarci u okvir","4","7"],["Korneri","5","8"],["Prekršaji","14","11"],["Žuti kartoni","3","1"]]'></div>

<h2>Šta dalje za Real Madrid?</h2>

<p>Real Madrid je ostvario važnu prednost uoči revanša na Santiago Bernabéu. Carlo Ancelotti izjavio je nakon utakmice da je ponosan na reakciju svojih igrača i da klub stoji iza Viníciusa. Uzvratna utakmica zakazana je za narednu sedmicu, a Real Madrid će imati priliku da potvrdi plasman u četvrtfinale Lige prvaka.</p>

<p>Vinícius Júnior objavio je poruku na društvenim mrežama nakon utakmice u kojoj je napisao: "Neću prestati plesati. Neću prestati biti ono što jesam. Neću dozvoliti kukavicama da me zaustave."</p>

<div data-widget="social-embed" data-platform="twitter" data-text="Neću prestati plesati. Neću prestati biti ono što jesam. Kukavice me neće zaustaviti. 🇧🇷⚽💃" data-author="@vinijr" data-timestamp="18. februar 2026."></div>

<div data-widget="poll" data-question="Ko će osvojiti Ligu prvaka ove sezone?" data-options='["Real Madrid","Arsenal","Barcelona","Bayern München"]'></div>

<h2>Test znanja</h2>

<div data-widget="quiz" data-title="Koliko poznajete Ligu prvaka?" data-questions='[{"q":"Ko je najbolji strijelac Lige prvaka svih vremena?","options":["Lionel Messi","Cristiano Ronaldo","Robert Lewandowski","Raúl González"],"correct":1},{"q":"Koji klub je osvojio pet uzastopnih titula u LŠ?","options":["FC Barcelona","Real Madrid","AC Milan","Bayern München"],"correct":1},{"q":"Gdje je odigrano finale Lige prvaka 2024?","options":["Pariz","London","Istanbul","Berlin"],"correct":1},{"q":"Ko je postigao najbrži gol u historiji LŠ?","options":["Roy Makaay","Cristiano Ronaldo","Kylian Mbappé","Erling Haaland"],"correct":0},{"q":"Koliko puta je Real Madrid osvojio Ligu prvaka ukupno?","options":["12","14","15","16"],"correct":2}]'></div>

<div data-widget="video" data-url="https://www.youtube.com/embed/ZgqsaDnsEq8" data-caption="Benfica vs Real Madrid — Pregled utakmice"></div>

<div data-widget="sources" data-sources='["The Guardian Football","ESPN FC","Marca","BBC Sport"]'></div>`

const ARTICLE_SLUG = 'vinicius-junior-rasizam-real-madrid-benfica-liga-prvaka'
const ARTICLE_TITLE = 'Vinícius Júnior i Real Madrid bili spremni napustiti teren nakon rasističkih uvreda u Ligi prvaka'
const ARTICLE_EXCERPT = 'Vinícius Júnior i njegovi saigrači iz Real Madrida bili su spremni da napuste teren nakon rasističkih uvreda u prvoj utakmici play-off faze Lige prvaka protiv Benfice.'
const TARGET_ID = 'cmlrq61x70003l8046mjllzwb'

async function main() {
  console.log('Seeding rich article...')

  // Find default site
  const site = await prisma.site.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })

  if (!site) {
    console.error('No site found. Create a site first.')
    process.exit(1)
  }

  console.log(`Site: ${site.name} (${site.id})`)

  // Find or create "Vijesti" category
  let category = await prisma.category.findFirst({
    where: { siteId: site.id, slug: 'vijesti' },
  })
  if (!category) {
    category = await prisma.category.create({
      data: { siteId: site.id, name: 'Vijesti', slug: 'vijesti' },
    })
    console.log('Created category: Vijesti')
  }

  // Try to find article by target ID first
  let article = await prisma.article.findUnique({ where: { id: TARGET_ID } })

  if (article) {
    console.log(`Found article by ID: ${TARGET_ID}`)
    // Update it
    article = await prisma.article.update({
      where: { id: TARGET_ID },
      data: {
        siteId: site.id,
        title: ARTICLE_TITLE,
        slug: ARTICLE_SLUG,
        content: { html: ARTICLE_HTML },
        excerpt: ARTICLE_EXCERPT,
        status: 'PUBLISHED',
        publishedAt: article.publishedAt || new Date(),
        categoryId: category.id,
        metaTitle: `${ARTICLE_TITLE} — Sport.ba`,
        metaDescription: ARTICLE_EXCERPT,
      },
    })
    console.log(`Updated article: ${article.slug}`)
  } else {
    // Try to find by slug
    article = await prisma.article.findFirst({
      where: { siteId: site.id, slug: ARTICLE_SLUG },
    })

    if (article) {
      console.log(`Found article by slug: ${ARTICLE_SLUG}`)
      article = await prisma.article.update({
        where: { id: article.id },
        data: {
          title: ARTICLE_TITLE,
          content: { html: ARTICLE_HTML },
          excerpt: ARTICLE_EXCERPT,
          status: 'PUBLISHED',
          publishedAt: article.publishedAt || new Date(),
          categoryId: category.id,
          metaTitle: `${ARTICLE_TITLE} — Sport.ba`,
          metaDescription: ARTICLE_EXCERPT,
        },
      })
      console.log(`Updated article: ${article.slug}`)
    } else {
      // Create new article
      article = await prisma.article.create({
        data: {
          siteId: site.id,
          title: ARTICLE_TITLE,
          slug: ARTICLE_SLUG,
          content: { html: ARTICLE_HTML },
          excerpt: ARTICLE_EXCERPT,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          categoryId: category.id,
          aiGenerated: false,
          metaTitle: `${ARTICLE_TITLE} — Sport.ba`,
          metaDescription: ARTICLE_EXCERPT,
        },
      })
      console.log(`Created article: ${article.slug} (${article.id})`)
    }
  }

  // Create tags
  const tagNames = ['Vinícius Júnior', 'Real Madrid', 'Benfica', 'Liga prvaka', 'Rasizam', 'UEFA']
  for (const tagName of tagNames) {
    const slug = tagName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 60)
    if (!slug) continue
    let tag = await prisma.tag.findFirst({ where: { siteId: site.id, slug } })
    if (!tag) {
      tag = await prisma.tag.create({ data: { siteId: site.id, name: tagName, slug } })
    }
    await prisma.articleTag.create({ data: { articleId: article.id, tagId: tag.id } }).catch(() => {})
  }

  console.log('\nDone!')
  console.log(`Article ID: ${article.id}`)
  console.log(`Slug: ${article.slug}`)
  console.log(`URL: /vijesti/${article.slug}`)
  console.log(`Tags: ${tagNames.join(', ')}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
