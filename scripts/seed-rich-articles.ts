import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const richHtml = `<p class="lead">Brazilski napadač Real Madrida Vinícius Júnior optužio je igrača Benfice Gianluca Prestianija za rasističku uvredu tokom utakmice Lige prvaka na Estádio da Luz.</p>

<div data-widget="match" data-home="Benfica" data-away="Real Madrid" data-home-short="BEN" data-away-short="RMA" data-score="0-1" data-league="Liga Prvaka — Play-off, 1. utakmica" data-date="18.02.2026" data-status="FT"></div>

<h2>Incident na Estádio da Luz</h2>

<p>Vinícius je proslavio gol plesom u uglu stadiona, nakon čega je Prestianni navodno uputio rasističku uvredu dok je pokrivao usta rukom. Sudija je odmah prekinuo utakmicu na 10 minuta dok su se strasti smirile.</p>

<p>Utakmica je nastavljena nakon pauze, a Real Madrid je zadržao pobjedu 1:0 koja im daje prednost uoči revanša na Santiago Bernabéu.</p>

<div data-widget="video" data-url="https://www.youtube.com/embed/MVGImutNTRk" data-caption="Vinícius Jr i incident na utakmici Benfica - Real Madrid"></div>

<div data-widget="player-card" data-name="Vinícius Júnior" data-team="Real Madrid" data-position="Lijevo krilo" data-nationality="Brazil" data-age="25" data-rating="8.2" data-goals="12" data-assists="8" data-market-value="€150M"></div>

<h2>Rasizam u evropskom fudbalu</h2>

<p>Ovo je najnoviji u nizu rasističkih incidenata koji su pogodili Viníciusa Jr tokom karijere u Španiji. UEFA je pokrenula disciplinski postupak protiv Benfice, a predsjednik kluba osuđuje diskriminaciju.</p>

<h2>Statistika utakmice</h2>

<div data-widget="stats-table" data-title="Benfica vs Real Madrid" data-stats='[{"label":"Posjed lopte","home":"45%","away":"55%","homeVal":45,"awayVal":55},{"label":"Udarci","home":"12","away":"18","homeVal":12,"awayVal":18},{"label":"Udarci u okvir","home":"4","away":"7","homeVal":4,"awayVal":7},{"label":"Korneri","home":"5","away":"8","homeVal":5,"awayVal":8},{"label":"Prekršaji","home":"14","away":"11","homeVal":14,"awayVal":11},{"label":"Žuti kartoni","home":"3","away":"1","homeVal":3,"awayVal":1}]' data-home="Benfica" data-away="Real Madrid"></div>

<p>Real Madrid je dominirao utakmicom sa 55% posjeda i 18 udaraca. Carlo Ancelotti izjavio je nakon utakmice da je ponosan na reakciju tima i da klub stoji iza svog igrača.</p>

<div data-widget="poll" data-question="Ko će osvojiti Ligu prvaka 2025/26?" data-options='["Real Madrid","Arsenal","Barcelona","Bayern München"]'></div>

<h2>Test znanja: Liga Prvaka</h2>

<div data-widget="quiz" data-title="Koliko poznajete Ligu prvaka?" data-questions='[{"q":"Ko je najbolji strijelac Lige prvaka svih vremena?","options":["Lionel Messi","Cristiano Ronaldo","Robert Lewandowski","Raúl González"],"correct":1},{"q":"Koji klub je osvojio pet uzastopnih titula?","options":["FC Barcelona","Real Madrid","AC Milan","Bayern München"],"correct":1},{"q":"U kojem gradu je odigrano finale Lige prvaka 2024?","options":["Pariz","London","Istanbul","Berlin"],"correct":1},{"q":"Ko je postigao najbrži hat-trick u historiji LŠ?","options":["Bafétimbi Gomis","Robert Lewandowski","Luiz Adriano","Erling Haaland"],"correct":1},{"q":"Koliko puta je Real Madrid osvojio LŠ ukupno?","options":["12","14","15","16"],"correct":2}]'></div>

<div data-widget="tags" data-tags='["Liga Prvaka","Real Madrid","Benfica","Vinícius Júnior","Rasizam","La Liga"]'></div>`

const featuredImage = 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=1200&h=600&fit=crop'
const excerpt = 'Brazilski napadač Real Madrida Vinícius Júnior optužio je igrača Benfice Gianluca Prestianija za rasističku uvredu tokom utakmice Lige prvaka na Estádio da Luz.'

async function main() {
  // Article IDs to update
  const ids = ['cmlsdfr220001js04yl09fhlp', 'cmlrq61x70003l8046mjllzwb']

  for (const id of ids) {
    try {
      const article = await prisma.article.findUnique({ where: { id } })
      if (!article) {
        console.log(`Article ${id} not found, skipping`)
        continue
      }

      await prisma.article.update({
        where: { id },
        data: {
          content: richHtml,
          featuredImage,
          excerpt,
        },
      })
      console.log(`Updated article ${id}: ${article.title}`)
    } catch (err) {
      console.error(`Error updating ${id}:`, err)
    }
  }

  // Also update any articles that don't have these IDs but match the Vinicius topic
  const vinicArticles = await prisma.article.findMany({
    where: {
      title: { contains: 'Vin', mode: 'insensitive' },
      id: { notIn: ids },
    },
    select: { id: true, title: true },
  })

  for (const art of vinicArticles) {
    await prisma.article.update({
      where: { id: art.id },
      data: {
        content: richHtml,
        featuredImage,
        excerpt,
      },
    })
    console.log(`Updated related article ${art.id}: ${art.title}`)
  }

  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
