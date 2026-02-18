import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const richHtml = `<p class="lead">Brazilski napadač Real Madrida Vinícius Júnior optužio je igrača Benfice Gianluca Prestianija za rasističku uvredu tokom utakmice Lige prvaka na Estádio da Luz.</p>

<div data-widget="match" data-home="Benfica" data-away="Real Madrid" data-score="0-1" data-league="Liga Prvaka" data-date="18.02.2026" data-status="FT"></div>

<h2>Incident na Estádio da Luz</h2>

<p>Vinícius je proslavio gol plesom u uglu stadiona, nakon čega je Prestianni navodno uputio rasističku uvredu dok je pokrivao usta rukom. Sudija je odmah prekinuo utakmicu na 10 minuta dok su se strasti smirile.</p>

<p>Utakmica je nastavljena nakon pauze, a Real Madrid je zadržao pobjedu 1:0 koja im daje prednost uoči revanša na Santiago Bernabéu.</p>

<div data-widget="video" data-url="https://www.youtube.com/embed/ScMzIvxBSi4" data-caption="Vinícius Júnior — Sezona 2025/26"></div>

<div data-widget="player-card" data-name="Vinícius Júnior" data-team="Real Madrid" data-position="LW" data-rating="8.2" data-goals="12" data-assists="8" data-market-value="€150M"></div>

<h2>Rasizam u evropskom fudbalu</h2>

<p>Ovo je najnoviji u nizu rasističkih incidenata koji su pogodili Viníciusa Jr tokom karijere u Španiji. UEFA je pokrenula disciplinski postupak protiv Benfice, a predsjednik kluba osuđuje diskriminaciju.</p>

<div data-widget="gallery" data-images='[{"url":"https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800","caption":"Estádio da Luz"},{"url":"https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800","caption":"Akcija iz utakmice"},{"url":"https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800","caption":"Navijači"},{"url":"https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800","caption":"Slavlje nakon gola"}]'></div>

<h2>Statistika utakmice</h2>

<div data-widget="stats-table" data-title="Benfica vs Real Madrid" data-headers='["","Benfica","Real Madrid"]' data-rows='[["Posjed lopte","45%","55%"],["Udarci","12","18"],["Udarci u okvir","4","7"],["Korneri","5","8"],["Prekršaji","14","11"]]'></div>

<p>Real Madrid je dominirao utakmicom, a Carlo Ancelotti izjavio je da je ponosan na reakciju tima. Uzvratna utakmica na Bernabéu bit će ključna za plasman u četvrtfinale.</p>

<div data-widget="social-embed" data-platform="twitter" data-text="Neću prestati plesati. Neću prestati biti ono što jesam. Kukavice me neće zaustaviti. 🇧🇷⚽💃" data-author="@vinaborealJr" data-timestamp="18. februar 2026."></div>

<div data-widget="poll" data-question="Ko će osvojiti Ligu prvaka ove sezone?" data-options='["Real Madrid","Arsenal","Barcelona","Bayern München"]'></div>

<h2>Test znanja: Liga Prvaka</h2>

<div data-widget="quiz" data-title="Koliko poznajete Ligu prvaka?" data-questions='[{"q":"Ko je najbolji strijelac Lige prvaka svih vremena?","options":["Lionel Messi","Cristiano Ronaldo","Robert Lewandowski","Raúl González"],"correct":1},{"q":"Koji klub je osvojio pet uzastopnih titula?","options":["FC Barcelona","Real Madrid","AC Milan","Bayern München"],"correct":1},{"q":"Gdje je odigrano finale 2024?","options":["Pariz","London","Istanbul","Berlin"],"correct":1},{"q":"Ko je postigao najbrži gol u historiji LŠ?","options":["Roy Makaay","Cristiano Ronaldo","Kylian Mbappé","Erling Haaland"],"correct":0},{"q":"Koliko puta je Real Madrid osvojio LŠ?","options":["12","14","15","16"],"correct":2}]'></div>

<div data-widget="video" data-url="https://www.youtube.com/embed/ZgqsaDnsEq8" data-caption="Benfica vs Real Madrid — Pregled utakmice"></div>

<div data-widget="sources" data-sources='["The Guardian Football","ESPN FC","Marca","BBC Sport"]'></div>`

const featuredImage = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&h=600&fit=crop'
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
