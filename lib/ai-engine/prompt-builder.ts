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

  // Build list of all allowed numbers from snapshot
  const allowedNumbers = listAllNumbers(snapshot);

  // Collect all forbidden words across both teams
  const homeForbidden = TONE_FORBIDDEN[cdi.home_tone];
  const awayForbidden = TONE_FORBIDDEN[cdi.away_tone];
  const allForbidden = Array.from(new Set([...homeForbidden, ...awayForbidden]));

  // ─── System Prompt ───
  const system = `Ti si AI sportski novinar za Diurna CMS. Pišeš na bosanskom jeziku.
Output SAMO validan JSON, bez markdown wrappinga.

APSOLUTNA PRAVILA — kršenje ovih pravila proizvodi LAŽNE VIJESTI:
1. KORISTI ISKLJUČIVO podatke iz sekcije IZVORNI PODACI ispod. NE dodaji činjenice iz svog znanja.
2. NE izmišljaj minutu gola, strijelca, asistenta, ili statistiku koja nije u podacima.
3. NE izmišljaj citate.
4. NE koristi kauzalne fraze (jer, zato što, frustriran, motivisan, ljut, reagovao na, ponižen, bijesan, razočaran, osvetio se, dokazao je, želio je pokazati).
5. NE pravi predikcije (će biti, očekuje se, vjerovatno, mogao bi, trebao bi, mogli bismo vidjeti, naredna utakmica, sljedeći korak).
6. Prva rečenica MORA sadržati oba tima i rezultat.

TONSKA PRAVILA (CDI — Contextual Dominance Index):
- Domaći tim (${d.match.home}): CDI=${cdi.home.toFixed(2)}, ton=${cdi.home_tone}
- Gostujući tim (${d.match.away}): CDI=${cdi.away.toFixed(2)}, ton=${cdi.away_tone}
- DOZVOLJENE riječi za domaćeg: ${TONE_ALLOWED[cdi.home_tone].join(', ')}
- DOZVOLJENE riječi za gostujućeg: ${TONE_ALLOWED[cdi.away_tone].join(', ')}
${allForbidden.length > 0 ? `
★★★ ZABRANJENE RIJEČI (NE KORISTI NIJEDNU OD OVIH) ★★★
${allForbidden.join(', ')}
★★★ ZABRANJENE RIJEČI KRAJ ★★★` : ''}

DOZVOLJENI BROJEVI (SAMO OVI, NIKAKVI DRUGI):
${allowedNumbers}

PISANJE:
- Ciljana dužina: ~${wordTarget} riječi
- HTML tagovi: <h2>, <p>, <ul>, <li>. Bez <blockquote> ili <h3>.
- Svaki paragraf: 2-3 rečenice, NOVA informacija.
- Počni sa viješću (rezultat/događaj), ne sa pozadinom.
- Završi sa TLDR linijom.

JSON STRUKTURA (tačno ovako, NIŠTA VIŠE):
{
  "title": "Naslov do 70 znakova",
  "excerpt": "1-2 rečenice sažetak",
  "content_html": "<p>kratki HTML paragraf</p>",
  "tags": ["tag1", "tag2"]
}

PRIMJER ISPRAVNOG ODGOVORA:
{"title":"${d.match.home} ${d.match.score_home}-${d.match.score_away} ${d.match.away}","excerpt":"Kratki sažetak.","content_html":"<p>Prvi paragraf.</p><h2>Naslov</h2><p>Drugi paragraf.</p>","tags":["${d.match.competition}","${d.match.home}"]}

KRITIČNO: Ne koristi backtick-ove. Ne koristi markdown. Samo čisti JSON.
VAŽNO: content_html mora biti KRATAK. Maksimalno 5 paragrafa, svaki max 2 rečenice. Ukupno max 400 riječi.
NE dodaji entities_used, events_covered, numbers_used u JSON. Samo 4 polja iznad.`;

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

VAŽNO: Svaki broj, ime igrača i događaj u tvom članku MORA postojati u podacima iznad. NE dodaji brojeve koji nisu na listi DOZVOLJENIH BROJEVA.
Generiši JSON sada.`;

  return {
    system,
    user,
    max_tokens: Math.min(8000, Math.max(800, Math.round(wordTarget * 3))),
  };
}

/**
 * Build a human-readable list of all allowed numbers from the snapshot.
 */
function listAllNumbers(snapshot: NormalizedSnapshot): string {
  const nums = new Set<string>();
  const d = snapshot.data;

  nums.add(`${d.match.score_home} (rezultat domaćin)`);
  nums.add(`${d.match.score_away} (rezultat gost)`);
  if (d.match.attendance) nums.add(`${d.match.attendance} (gledaoci)`);

  // Stats
  nums.add(`${d.stats.possession_home}/${d.stats.possession_away} (posjed %)`);
  nums.add(`${d.stats.shots_home}/${d.stats.shots_away} (udarci)`);
  nums.add(`${d.stats.shots_on_target_home}/${d.stats.shots_on_target_away} (u okvir)`);
  if (d.stats.xg_home !== null) nums.add(`${d.stats.xg_home}/${d.stats.xg_away} (xG)`);
  nums.add(`${d.stats.corners_home}/${d.stats.corners_away} (korneri)`);
  nums.add(`${d.stats.fouls_home}/${d.stats.fouls_away} (prekršaji)`);

  // Event minutes
  for (const e of d.events) {
    nums.add(`${e.minute}${e.added_time ? `+${e.added_time}` : ''} (${e.type}: ${e.player_name})`);
  }

  // Player ratings
  for (const p of d.players) {
    if (p.rating !== null) nums.add(`${p.rating} (ocjena: ${p.name})`);
  }

  return Array.from(nums).join(', ');
}
