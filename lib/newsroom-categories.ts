export type CategoryItem = {
  slug: string
  label: string
  icon: string
  section: string
}

export const FOOTBALL_CATEGORIES: CategoryItem[] = [
  { slug: 'sve', label: 'Sve priče', icon: '📊', section: 'PREGLED' },
  { slug: 'vijesti', label: 'Vijesti', icon: '⚡', section: 'KATEGORIJE' },
  { slug: 'transferi', label: 'Transferi', icon: '🔄', section: 'KATEGORIJE' },
  { slug: 'utakmice', label: 'Utakmice', icon: '⚽', section: 'KATEGORIJE' },
  { slug: 'povrede', label: 'Povrede', icon: '🏥', section: 'KATEGORIJE' },
  { slug: 'igraci', label: 'Igrači', icon: '👤', section: 'KATEGORIJE' },
  { slug: 'klubovi', label: 'Klubovi', icon: '🏟️', section: 'KATEGORIJE' },
  { slug: 'napisano', label: 'Napisano', icon: '✅', section: 'STATUS' },
  { slug: 'ceka', label: 'Čeka', icon: '⏳', section: 'STATUS' },
]

export const NEWS_CATEGORIES: CategoryItem[] = [
  { slug: 'sve', label: 'Sve priče', icon: '📊', section: 'PREGLED' },
  { slug: 'aktuelno', label: 'Aktuelno', icon: '⚡', section: 'VIJESTI' },
  { slug: 'bih', label: 'Bosna i Hercegovina', icon: '🇧🇦', section: 'VIJESTI' },
  { slug: 'svijet', label: 'Svijet', icon: '🌍', section: 'VIJESTI' },
  { slug: 'region', label: 'Region', icon: '🗺️', section: 'VIJESTI' },
  { slug: 'crna-hronika', label: 'Crna hronika', icon: '🔴', section: 'VIJESTI' },
  { slug: 'sport', label: 'Sport', icon: '🏆', section: 'SPORT' },
  { slug: 'fudbal', label: '↳ Fudbal', icon: '⚽', section: 'SPORT' },
  { slug: 'kosarka', label: '↳ Košarka', icon: '🏀', section: 'SPORT' },
  { slug: 'tech', label: 'Tech', icon: '💻', section: 'OSTALO' },
  { slug: 'biznis', label: 'Biznis', icon: '💼', section: 'OSTALO' },
  { slug: 'nauka', label: 'Nauka', icon: '🔬', section: 'OSTALO' },
  { slug: 'zanimljivosti', label: 'Zanimljivosti', icon: '✨', section: 'OSTALO' },
  { slug: 'show', label: 'Show', icon: '🎬', section: 'OSTALO' },
  { slug: 'napisano', label: 'Napisano', icon: '✅', section: 'STATUS' },
  { slug: 'ceka', label: 'Čeka', icon: '⏳', section: 'STATUS' },
]

export function getCategoriesForSite(domain: string | null | undefined): CategoryItem[] {
  const footballDomains = ['todayfootballmatch', 'football', 'soccer', 'sport']
  const isFootball = footballDomains.some(d => domain?.toLowerCase().includes(d))
  return isFootball ? FOOTBALL_CATEGORIES : NEWS_CATEGORIES
}

export function detectCategoryFromTitle(title: string): string {
  const t = title.toLowerCase()
  if (t.match(/bih|bosna|sarajevo|mostar|hercegovina|fbih|rs |tuzla|zenica|banja\s?luka/)) return 'bih'
  if (t.match(/trump|putin|zelensky|eu\b|nato|un\b|biden|white house|china|iran|ukraine|russia/)) return 'svijet'
  if (t.match(/srbija|hrvatska|crna gora|region|beograd|zagreb|podgorica|skoplje|priština/)) return 'region'
  if (t.match(/uboj|pucnj|hapšen|uhapšen|ubistvo|kriminal|policija|sud\b|zatvor|nestala?|pljačk/)) return 'crna-hronika'
  if (t.match(/fudbal|football|premier|liga|chelsea|arsenal|barcelona|transfer|trener|golman/)) return 'fudbal'
  if (t.match(/košarka|nba|basketball|euroleague|aba liga/)) return 'kosarka'
  if (t.match(/sport|olimp|atletika|tenis|formula|ufc|boks/)) return 'sport'
  if (t.match(/tech|ai\b|google|apple|microsoft|startup|software|iphone|android/)) return 'tech'
  if (t.match(/biznis|ekonomija|berza|euro|banka|kompanija|inflacija|gdp|plata/)) return 'biznis'
  if (t.match(/nauka|istraživanje|svemirski|klimat|vakcin|studija/)) return 'nauka'
  if (t.match(/show|celebrity|glumac|pjevač|film|serija|muzika|instagram/)) return 'show'
  return 'aktuelno'
}
