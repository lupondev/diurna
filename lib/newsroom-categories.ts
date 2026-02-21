export type CategoryItem = {
  slug: string
  label: string
  icon: string
  section: string
}

export const FOOTBALL_CATEGORIES: CategoryItem[] = [
  { slug: 'sve', label: 'All Stories', icon: '📊', section: 'OVERVIEW' },
  { slug: 'vijesti', label: 'News', icon: '⚡', section: 'CATEGORIES' },
  { slug: 'transferi', label: 'Transfers', icon: '🔄', section: 'CATEGORIES' },
  { slug: 'utakmice', label: 'Matches', icon: '⚽', section: 'CATEGORIES' },
  { slug: 'povrede', label: 'Injuries', icon: '🏥', section: 'CATEGORIES' },
  { slug: 'igraci', label: 'Players', icon: '👤', section: 'CATEGORIES' },
  { slug: 'klubovi', label: 'Clubs', icon: '🏟️', section: 'CATEGORIES' },
  { slug: 'napisano', label: 'Written', icon: '✅', section: 'STATUS' },
  { slug: 'ceka', label: 'Pending', icon: '⏳', section: 'STATUS' },
]

export const NEWS_CATEGORIES: CategoryItem[] = [
  { slug: 'sve', label: 'All Stories', icon: '📊', section: 'OVERVIEW' },
  { slug: 'aktuelno', label: 'Breaking', icon: '⚡', section: 'NEWS' },
  { slug: 'bih', label: 'Bosnia & Herzegovina', icon: '🇧🇦', section: 'NEWS' },
  { slug: 'svijet', label: 'World', icon: '🌍', section: 'NEWS' },
  { slug: 'region', label: 'Region', icon: '🗺️', section: 'NEWS' },
  { slug: 'crna-hronika', label: 'Crime', icon: '🔴', section: 'NEWS' },
  { slug: 'sport', label: 'Sport', icon: '🏆', section: 'SPORT' },
  { slug: 'fudbal', label: '↳ Football', icon: '⚽', section: 'SPORT' },
  { slug: 'kosarka', label: '↳ Basketball', icon: '🏀', section: 'SPORT' },
  { slug: 'tech', label: 'Tech', icon: '💻', section: 'OTHER' },
  { slug: 'biznis', label: 'Business', icon: '💼', section: 'OTHER' },
  { slug: 'nauka', label: 'Science', icon: '🔬', section: 'OTHER' },
  { slug: 'zanimljivosti', label: 'Lifestyle', icon: '✨', section: 'OTHER' },
  { slug: 'show', label: 'Entertainment', icon: '🎬', section: 'OTHER' },
  { slug: 'napisano', label: 'Written', icon: '✅', section: 'STATUS' },
  { slug: 'ceka', label: 'Pending', icon: '⏳', section: 'STATUS' },
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
