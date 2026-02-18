import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/* ═══════════════════════════════════════════════════
   Seed Article — Vinícius Júnior showcase
   Creates a full article with ALL widget types embedded
   as Tiptap JSON with widget nodes.
   ═══════════════════════════════════════════════════ */

function p(text: string) {
  return { type: 'paragraph' as const, content: [{ type: 'text' as const, text }] }
}

function h2(text: string) {
  return { type: 'heading' as const, attrs: { level: 2 }, content: [{ type: 'text' as const, text }] }
}

function boldText(text: string) {
  return { type: 'text' as const, text, marks: [{ type: 'bold' as const }] }
}

function mixedP(...parts: { type: string; text: string; marks?: { type: string }[] }[]) {
  return { type: 'paragraph' as const, content: parts }
}

function widget(type: string, data: Record<string, unknown>) {
  const attrs: Record<string, string> = { widget: type }
  for (const [k, v] of Object.entries(data)) {
    attrs[k] = typeof v === 'string' ? v : JSON.stringify(v)
  }
  return { type: 'widget' as const, attrs }
}

const ARTICLE_CONTENT = {
  type: 'doc',
  content: [
    // ── Intro
    p('Vinícius Júnior, mladi brazilski čarobnjak koji je osvojio srca navijača Real Madrida, nastavio je svoju dominantnu sezonu 2025/26 sa impresivnom serijom golova i asistencija. Sa samo 25 godina, Vinícius se etablirao kao jedan od najboljih igrača na svijetu, a mnogi ga smatraju glavnim kandidatom za Zlatnu loptu.'),

    p('Njegov put od Flamenga do Santiago Bernabeua je priča o talentu, upornosti i nepokolebljivoj vjeri u vlastite sposobnosti. U tekstu donosimo detaljan pregled njegove karijere, statistike i utjecaja na modernu igru.'),

    // ── Player Card
    widget('player-card', {
      name: 'Vinícius Júnior',
      team: 'Real Madrid',
      position: 'Lijevo krilo',
      number: '7',
      nationality: '🇧🇷 Brazil',
      image: '',
      stats: [
        { label: 'Golovi', value: '19' },
        { label: 'Asistencije', value: '12' },
        { label: 'Utakmice', value: '28' },
        { label: 'Driblinzi/90', value: '6.2' },
      ],
    }),

    // ── Section: Sezona
    h2('Sezona za pamćenje'),

    p('U dosadašnjem toku sezone, Vinícius je postigao 19 golova i dodao 12 asistencija u svim takmičenjima. Njegova statistika u Ligi prvaka posebno impresionira — 7 golova u 6 utakmica grupne faze postavilo ga je na vrh liste strijelaca.'),

    mixedP(
      { type: 'text', text: 'Trener Carlo Ancelotti opisao ga je kao ' },
      boldText('"najkompletnijeg igrača s kojim sam ikada radio"'),
      { type: 'text', text: ', navodeći njegovu sposobnost da mijenja utakmice u ključnim trenucima kao ono što ga izdvaja od ostalih.' },
    ),

    // ── Stats Table
    widget('stats-table', {
      title: 'Vinícius Júnior — Sezona 2025/26',
      headers: ['Takmičenje', 'Utakmice', 'Golovi', 'Asistencije', 'Min/Gol'],
      rows: [
        ['La Liga', '20', '11', '8', '148'],
        ['Liga prvaka', '6', '7', '3', '72'],
        ['Copa del Rey', '2', '1', '1', '164'],
        ['Ukupno', '28', '19', '12', '121'],
      ],
    }),

    // ── Section: Evolucija igre
    h2('Evolucija igre'),

    p('Ono što čini Viníciusovu transformaciju posebno impresivnom jeste njegova evolucija od čistog driblerа u kompletnog napadača. Dok je u prvim sezonama u Madridu često bio kritiziran zbog loše završnice, danas je jedan od najefikasnijih napadača u Evropi.'),

    p('Njegov rad s Ancelottijem rezultirao je poboljšanjem u gotovo svim aspektima igre. Pozicioniranje bez lopte, donošenje odluka u završnoj trećini i sposobnost igre na obje strane terena — sve je to podignuto na viši nivo. Posebno se ističe njegova igra u kombinaciji s Jude Bellinghamom i Kylianom Mbappéom, formirajući najsmrtonosniji napadački trio u evropskom fudbalu.'),

    // ── Video 1
    widget('video', {
      src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Vinícius Júnior — Svi golovi sezone 2025/26',
    }),

    // ── Section: Ključna utakmica
    h2('Ključna utakmica: El Clásico'),

    p('Posljednji El Clásico bio je Viníciusov show. Dva gola i jedna asistencija u pobjedi 3:1 nad Barcelonom na Camp Nou potvrdili su njegov status igrača za velike utakmice. Prvi gol, spektakularni solo prodor s lijeve strane gdje je prošao trojicu igrača prije preciznog šuta u dalji kut, već se smatra jednim od golova sezone.'),

    // ── Match Widget
    widget('match', {
      home: 'Barcelona',
      away: 'Real Madrid',
      score: '1 - 3',
      date: '8. februar 2026.',
      competition: 'La Liga — Kolo 23',
      stadium: 'Camp Nou, Barcelona',
    }),

    p('Nakon utakmice, Vinícius je izjavio: "Ovo su utakmice za koje živim. Camp Nou je posebna pozornica, a pokazati ovakvu igru pred 95.000 ljudi je nešto što ne mogu opisati riječima."'),

    // ── Social Embed
    widget('social-embed', {
      platform: 'twitter',
      author: 'Vinícius Jr.',
      handle: '@vinikidjr',
      text: '¡Camp Nou es mi jardín! 🤍⚽ Grande victoria, grande equipo. #HalaMadrid #ElClasico',
      date: '8. feb 2026.',
    }),

    // ── Gallery
    widget('gallery', {
      images: [
        { src: '', caption: 'Vinícius slavi gol na Camp Nou' },
        { src: '', caption: 'Dribling pored Araujo' },
        { src: '', caption: 'Slavlje sa saigračima' },
        { src: '', caption: 'Standing ovation navijača Real Madrida' },
      ],
    }),

    // ── Section: Utjecaj van terena
    h2('Utjecaj van terena'),

    p('Vinícius nije samo fudbaler — on je globalni brand i glas borbe protiv rasizma u fudbalu. Njegove javne izjave o diskriminaciji s kojom se suočavao u španskom fudbalu pokrenule su važnu diskusiju i dovele do konkretnih promjena u La Ligi.'),

    p('Njegova fondacija "Instituto Vini Jr." pomaže mladim sportistima iz favela u Brazilu, a partnerstvo s Nike-om donijelo mu je ugovor vrijedan 100 miliona eura, čineći ga jednim od najplaćenijih sportista na planeti.'),

    // ── Video 2
    widget('video', {
      src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Vinícius Júnior — Put od Flamenga do Real Madrida (dokumentarac)',
    }),

    // ── Poll
    widget('poll', {
      question: 'Ko je trenutno najbolji igrač na svijetu?',
      options: ['Vinícius Júnior', 'Kylian Mbappé', 'Erling Haaland', 'Jude Bellingham'],
    }),

    // ── Section: Budućnost
    h2('Pogled u budućnost'),

    p('Sa Realovom dominantnom pozicijom u La Ligi i Ligi prvaka, Vinícius ima realnu šansu da ove sezone osvoji duplu krunu. Ako nastavi ovim tempom, Zlatna lopta 2026 mogla bi biti njegova — treća uzastopna za igrača Real Madrida.'),

    p('Ugovor koji ga veže za Real Madrid do 2029. godine sa klauzulom od milijardu eura govori o tome koliko ga klub cijeni. U Madridu ga smatraju nasljednikom Cristiana Ronalda — ne samo kao najboljeg igrača kluba, već kao ikone koja definiše eru.'),

    // ── Quiz (5 questions)
    widget('quiz', {
      questions: [
        {
          q: 'Iz kojeg kluba je Vinícius Júnior došao u Real Madrid?',
          options: ['Santos', 'Flamengo', 'Palmeiras', 'São Paulo'],
          correct: 1,
        },
        {
          q: 'Koji broj dres nosi Vinícius u Real Madridu?',
          options: ['10', '11', '7', '20'],
          correct: 2,
        },
        {
          q: 'Koliko golova je postigao u grupnoj fazi Lige prvaka 2025/26?',
          options: ['4', '5', '6', '7'],
          correct: 3,
        },
        {
          q: 'Koji trener vodi Real Madrid u sezoni 2025/26?',
          options: ['Zinedine Zidane', 'Xabi Alonso', 'Carlo Ancelotti', 'José Mourinho'],
          correct: 2,
        },
        {
          q: 'Kolika je Viníciusova klauzula o otkupu?',
          options: ['500 miliona €', '750 miliona €', '1 milijarda €', '1.5 milijardi €'],
          correct: 2,
        },
      ],
    }),

    // ── Sources
    widget('sources', {
      sources: [
        { name: 'Marca — Vinícius Jr: Sezona za historiju', url: 'https://marca.com' },
        { name: 'AS — El Clásico: Vinícius show na Camp Nou', url: 'https://as.com' },
        { name: 'UEFA — Liga prvaka statistika', url: 'https://uefa.com' },
        { name: 'Transfermarkt — Vinícius Júnior profil', url: 'https://transfermarkt.com' },
        { name: 'ESPN — Real Madrid sezona 2025/26', url: 'https://espn.com' },
      ],
    }),
  ],
}

export async function GET() {
  try {
    const site = await prisma.site.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })

    if (!site) {
      return NextResponse.json({ error: 'No site found. Create a site first.' }, { status: 404 })
    }

    // Find or create "Vijesti" category
    let category = await prisma.category.findFirst({
      where: { siteId: site.id, slug: 'vijesti' },
    })
    if (!category) {
      category = await prisma.category.create({
        data: { siteId: site.id, name: 'Vijesti', slug: 'vijesti' },
      })
    }

    // Check if article already exists
    const existing = await prisma.article.findFirst({
      where: { siteId: site.id, slug: 'vinicius-junior-sezona-za-pamcenje-2026' },
    })

    if (existing) {
      // Update existing
      const updated = await prisma.article.update({
        where: { id: existing.id },
        data: {
          title: 'Vinícius Júnior: Sezona za pamćenje — 19 golova, El Clásico dominacija i put ka Zlatnoj lopti',
          content: ARTICLE_CONTENT as unknown as import('@prisma/client').Prisma.InputJsonValue,
          excerpt: 'Mladi brazilski čarobnjak nastavio je dominantnu sezonu sa 19 golova i 12 asistencija. Detaljan pregled karijere, statistike i utjecaja na modernu igru.',
          status: 'PUBLISHED',
          publishedAt: existing.publishedAt || new Date(),
          categoryId: category.id,
          metaTitle: 'Vinícius Júnior: Sezona za pamćenje 2025/26 — Sport.ba',
          metaDescription: 'Detaljan pregled sezone Viníciusa Júniora — 19 golova, El Clásico show, statistike i put ka Zlatnoj lopti 2026.',
        },
      })

      return NextResponse.json({
        action: 'updated',
        articleId: updated.id,
        slug: updated.slug,
        url: `/vijesti/${updated.slug}`,
        category: category.name,
      })
    }

    // Create article
    const article = await prisma.article.create({
      data: {
        siteId: site.id,
        title: 'Vinícius Júnior: Sezona za pamćenje — 19 golova, El Clásico dominacija i put ka Zlatnoj lopti',
        slug: 'vinicius-junior-sezona-za-pamcenje-2026',
        content: ARTICLE_CONTENT as unknown as import('@prisma/client').Prisma.InputJsonValue,
        excerpt: 'Mladi brazilski čarobnjak nastavio je dominantnu sezonu sa 19 golova i 12 asistencija. Detaljan pregled karijere, statistike i utjecaja na modernu igru.',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        categoryId: category.id,
        aiGenerated: false,
        metaTitle: 'Vinícius Júnior: Sezona za pamćenje 2025/26 — Sport.ba',
        metaDescription: 'Detaljan pregled sezone Viníciusa Júniora — 19 golova, El Clásico show, statistike i put ka Zlatnoj lopti 2026.',
      },
    })

    // Create tags
    const tagNames = ['Vinícius Júnior', 'Real Madrid', 'La Liga', 'Liga prvaka', 'El Clásico', 'Zlatna lopta']
    for (const tagName of tagNames) {
      const slug = tagName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 60)
      if (!slug) continue
      let tag = await prisma.tag.findFirst({ where: { siteId: site.id, slug } })
      if (!tag) {
        tag = await prisma.tag.create({ data: { siteId: site.id, name: tagName, slug } })
      }
      await prisma.articleTag.create({ data: { articleId: article.id, tagId: tag.id } }).catch(() => {})
    }

    return NextResponse.json({
      action: 'created',
      articleId: article.id,
      slug: article.slug,
      url: `/vijesti/${article.slug}`,
      category: category.name,
      tags: tagNames,
    })
  } catch (error) {
    console.error('Seed article error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

export async function POST() {
  return GET()
}
