import type { NormalizedSnapshot, CDIResult, ArticleType } from './types';
import { TONE_ALLOWED, TONE_FORBIDDEN } from './cdi';

/**
 * Prompt Builder — constructs structured LLM prompts from snapshot + CDI.
 * Ensures the AI has all source data in a compact, clear format
 * and understands the tone constraints from CDI.
 */

export interface BuiltPrompt {
  system: string;
  user: string;
  max_tokens: number;
}

const ARTICLE_TYPE_INSTRUCTIONS: Record<ArticleType, string> = {
  match_report: `Napiši izvještaj sa utakmice. Uključi rezultat, ključne događaje (golove, kartone, izmjene), statistiku i kratku analizu. Počni sa rezultatom.`,
  preview: `Napiši najavu utakmice. Uključi formu oba tima, ključne igrače, taktička očekivanja. Ne spekuliši o rezultatu.`,
  tactical_analysis: `Napiši taktičku analizu. Fokusiraj se na formacije, posjed, prilike, statistiku i ključne duel-situacije.`,
  transfer: `Napiši članak o transferu baziran na dostupnim podacima.`,
  historical_recap: `Napiši historijski pregled baziran na podacima.`,
};

const WORD_TARGETS: Record<ArticleType, number> = {
  match_report: 400,
  preview: 350,
  tactical_analysis: 500,
  transfer: 300,
  historical_recap: 400,
};

export function buildPrompt(snapshot: NormalizedSnapshot, cdi: CDIResult): BuiltPrompt {
  const d = snapshot.data;
  const articleType = snapshot.article_type;
  const wordTarget = WORD_TARGETS[articleType];

  // ─── System Prompt ───
  const system = `Ti si AI sportski novinar za Diurna CMS. Pišeš na bosanskom jeziku.
Output SAMO validan JSON, bez markdown wrappinga.

APSOLUTNA PRAVILA — kršenje ovih pravila proizvodi LAŽNE VIJESTI:
1. KORISTI ISKLJUČIVO podatke iz sekcije IZVORNI PODACI ispod. NE dodaji činjenice iz svog znanja.
2. NE izmišljaj minutu gola, strijelca, asistenta, ili statistiku koja nije u podacima.
3. NE izmišljaj citate.
4. NE koristi kauzalne fraze (jer, zato što, frustriran, motivisan, ljut).
5. NE pravi predikcije (će biti, očekuje se, vjerovatno, mogao bi).

TONSKA PRAVILA (CDI — Contextual Dominance Index):
- Domaći tim (${d.match.home}): CDI=${cdi.home.toFixed(2)}, ton=${cdi.home_tone}
- Gostujući tim (${d.match.away}): CDI=${cdi.away.toFixed(2)}, ton=${cdi.away_tone}
- DOZVOLJENE riječi za domaćeg: ${TONE_ALLOWED[cdi.home_tone].join(', ')}
- DOZVOLJENE riječi za gostujućeg: ${TONE_ALLOWED[cdi.away_tone].join(', ')}
- ZABRANJENE riječi za domaćeg: ${TONE_FORBIDDEN[cdi.home_tone].join(', ') || 'nema'}
- ZABRANJENE riječi za gostujućeg: ${TONE_FORBIDDEN[cdi.away_tone].join(', ') || 'nema'}

PISANJE:
- Ciljana dužina: ~${wordTarget} riječi
- HTML tagovi: <h2>, <p>, <ul>, <li>. Bez <blockquote> ili <h3>.
- Svaki paragraf: 2-3 rečenice, NOVA informacija.
- Počni sa viješću (rezultat/događaj), ne sa pozadinom.
- Završi sa TLDR linijom.

JSON STRUKTURA (tačno ovako):
{
  "title": "Naslov do 70 znakova",
  "excerpt": "1-2 rečenice sažetak",
  "content_html": "Članak u HTML-u (<h2>, <p>, <ul>, <li>). Završi sa TLDR.",
  "entities_used": [{"name": "Ime Igrača", "id": "player_id", "mentions": 1}],
  "events_covered": ["event_id_1", "event_id_2"],
  "numbers_used": [{"value": "67", "source_field": "events[0].minute"}],
  "tags": ["tag1", "tag2"]
}`;

  // ─── User Prompt with Source Data ───
  const user = `${ARTICLE_TYPE_INSTRUCTIONS[articleType]}

═══ IZVORNI PODACI ═══

UTAKMICA:
${d.match.home} (${d.match.home_short}) ${d.match.score_home} : ${d.match.score_away} ${d.match.away} (${d.match.away_short})
Datum: ${d.match.date} | Kickoff: ${d.match.kickoff}
Takmičenje: ${d.match.competition} — ${d.match.round}
Stadion: ${d.match.venue} | Sudija: ${d.match.referee}
${d.match.attendance ? `Gledaoci: ${d.match.attendance}` : ''}

DOGAĐAJI:
${d.events.map(e => `[${e.id}] ${e.minute}'${e.added_time ? `+${e.added_time}` : ''} ${e.type.toUpperCase()} — ${e.player_name} (${e.team}) ${e.detail}${e.assist_player_name ? ` | Asist: ${e.assist_player_name}` : ''} [težina: ${e.weight}]`).join('\n')}

STATISTIKA:
Posjed: ${d.stats.possession_home}% - ${d.stats.possession_away}%
Udarci: ${d.stats.shots_home} - ${d.stats.shots_away}
U okvir: ${d.stats.shots_on_target_home} - ${d.stats.shots_on_target_away}
${d.stats.xg_home !== null ? `xG: ${d.stats.xg_home} - ${d.stats.xg_away}` : ''}
Korneri: ${d.stats.corners_home} - ${d.stats.corners_away}
Prekršaji: ${d.stats.fouls_home} - ${d.stats.fouls_away}
Žuti kartoni: ${d.stats.yellow_cards_home} - ${d.stats.yellow_cards_away}
Crveni kartoni: ${d.stats.red_cards_home} - ${d.stats.red_cards_away}

IGRAČI:
${d.players.map(p => `[${p.id}] ${p.name} (${p.team}, ${p.position}) — ocjena: ${p.rating ?? 'N/A'}, golovi: ${p.goals}, asisti: ${p.assists}, minute: ${p.minutes_played}, žuti: ${p.yellow_cards}, crveni: ${p.red_cards}`).join('\n')}

${d.standings ? `TABELA:
Domaćin pozicija: ${d.standings.home_position ?? 'N/A'} | Forma: ${d.standings.home_form ?? 'N/A'}
Gost pozicija: ${d.standings.away_position ?? 'N/A'} | Forma: ${d.standings.away_form ?? 'N/A'}` : ''}

═══ KRAJ IZVORNIH PODATAKA ═══

VAŽNO: Svaki broj, ime igrača i događaj u tvom članku MORA postojati u podacima iznad.
Generiši JSON sada.`;

  return {
    system,
    user,
    max_tokens: Math.min(4000, Math.max(800, Math.round(wordTarget * 3))),
  };
}
