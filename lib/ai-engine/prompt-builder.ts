import type { NormalizedSnapshot, CDIResult, ArticleType } from './types';
import { TONE_ALLOWED, TONE_FORBIDDEN } from './cdi';
import { getLanguageConfig, getLanguagePromptSection } from './language-config';

/**
 * Prompt Builder — constructs structured LLM prompts from snapshot + CDI.
 * Ensures the AI has all source data in a compact, clear format
 * and understands the tone constraints from CDI.
 *
 * Now language-aware: accepts a language code to generate articles
 * in the correct BCMS variant or international language.
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

// English instructions for non-BCMS languages
const ARTICLE_TYPE_INSTRUCTIONS_EN: Record<ArticleType, string> = {
  match_report: `Write a match report. Include the score, key events (goals, cards, substitutions), stats and brief analysis. Start with the result.`,
  preview: `Write a match preview. Include both teams' form, key players, tactical expectations. Do not speculate about the result.`,
  tactical_analysis: `Write a tactical analysis. Focus on formations, possession, chances, stats and key duels.`,
  transfer: `Write a transfer article based on the available data.`,
  historical_recap: `Write a historical recap based on the data.`,
};

const WORD_TARGETS: Record<ArticleType, number> = {
  match_report: 400,
  preview: 350,
  tactical_analysis: 500,
  transfer: 300,
  historical_recap: 400,
};

/**
 * Build prompt with language awareness.
 * @param snapshot - normalized match data
 * @param cdi - contextual dominance index result
 * @param languageCode - language code (default: 'bs' for Bosnian)
 */
export function buildPrompt(snapshot: NormalizedSnapshot, cdi: CDIResult, languageCode: string = 'bs'): BuiltPrompt {
  const d = snapshot.data;
  const articleType = snapshot.article_type;
  const wordTarget = WORD_TARGETS[articleType];
  const langConfig = getLanguageConfig(languageCode);
  const isBCMS = ['bs', 'hr', 'sr', 'sr-Latn', 'sr-Cyrl', 'cnr'].includes(languageCode);

  // Build list of all allowed numbers from snapshot
  const allowedNumbers = listAllNumbers(snapshot, langConfig.sportTerms);

  // Collect all forbidden words across both teams (CDI tone)
  const homeForbidden = TONE_FORBIDDEN[cdi.home_tone];
  const awayForbidden = TONE_FORBIDDEN[cdi.away_tone];
  const allToneForbidden = Array.from(new Set([...homeForbidden, ...awayForbidden]));

  // Combine tone forbidden + language variant forbidden
  const allForbidden = Array.from(new Set([...allToneForbidden, ...langConfig.forbiddenTerms]));

  // Language-specific prompt section
  const languageSection = getLanguagePromptSection(langConfig);

  // ─── System Prompt ───
  const system = `Ti si AI sportski novinar za Diurna CMS. Pišeš na jeziku: ${langConfig.nativeName} (${langConfig.code}).
Output SAMO validan JSON, bez markdown wrappinga.
${languageSection}
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

══════════════════════════════════
STIL PISANJA (AP + Reuters + BBC + Economist)
══════════════════════════════════

UVOD:
- NE počinji sa golim rezultatom ("Real Madrid pobijedio Benficu 1-0")
- POČNI sa PRIČOM — ko je bio heroj, šta se desilo, zašto je važno
- Primjer: "Vinícius Júnior jednim preciznim udarcem osigurao je Real Madridu prednost na Estádio da Luz."
- Oba tima u prvoj rečenici. Max 25 riječi.

SHOW, DON'T TELL (Reuters):
- LOŠ: "Benfica je bila frustrirana."
- DOBAR: "Benfica je uputila samo 4 udarca u okvir gola."
- Činjenice GOVORE priču. Ti ih samo IZLAŽI.

JASNOĆA (Economist):
- Prosječna rečenica: 15-20 riječi
- Max paragraf: 3 rečenice
- Aktivna forma: "Vinícius je zabio" ne "Gol je postignut"
- Svaka riječ mora ZARADITI svoje mjesto

RAZNOLIK VOKABULAR:
- Ne ponavljaj iste riječi. Koristi sinonime:
  - Gol: postigao, zabio, pogodio, matirao golmana, realizovao
  - Utakmica: utakmica, dvoboj, susret, duel
  - Umjesto "igrač": napadač, veznjak, Brazilac, 25-godišnjak

ZABRANJENI KLIŠEJI:
zatresao mrežu, pokazao zube, stavio tačku na utakmicu, pružio ruku spasa, maestralna predstava, borba do posljednjeg daha, dominirao od prve minute

GRAMATIKA:
- IJEKAVICA (ne ekavica)
- Svi dijakritici obavezni: š, đ, č, ć, ž

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
  const instructions = isBCMS
    ? ARTICLE_TYPE_INSTRUCTIONS[articleType]
    : ARTICLE_TYPE_INSTRUCTIONS_EN[articleType];

  const st = langConfig.sportTerms;

  const user = `${instructions}

═══ IZVORNI PODACI ═══

UTAKMICA:
${d.match.home} (${d.match.home_short}) ${d.match.score_home} : ${d.match.score_away} ${d.match.away} (${d.match.away_short})
Datum: ${d.match.date} | Kickoff: ${d.match.kickoff}
Takmičenje: ${d.match.competition} — ${d.match.round}
Stadion: ${d.match.venue} | ${st.referee || 'Sudija'}: ${d.match.referee}
${d.match.attendance ? `Gledaoci: ${d.match.attendance}` : ''}

DOGAĐAJI:
${d.events.map(e => `[${e.id}] ${e.minute}'${e.added_time ? `+${e.added_time}` : ''} ${e.type.toUpperCase()} — ${e.player_name} (${e.team}) ${e.detail}${e.assist_player_name ? ` | ${st.assist || 'Asist'}: ${e.assist_player_name}` : ''} [težina: ${e.weight}]`).join('\n')}

STATISTIKA:
${st.possession || 'Posjed'}: ${d.stats.possession_home}% - ${d.stats.possession_away}%
${st.shot || 'Udarci'}: ${d.stats.shots_home} - ${d.stats.shots_away}
${st.shots_on_target || 'U okvir'}: ${d.stats.shots_on_target_home} - ${d.stats.shots_on_target_away}
${d.stats.xg_home !== null ? `xG: ${d.stats.xg_home} - ${d.stats.xg_away}` : ''}
${st.corner || 'Korneri'}: ${d.stats.corners_home} - ${d.stats.corners_away}
${st.foul || 'Prekršaji'}: ${d.stats.fouls_home} - ${d.stats.fouls_away}
${st.yellow_card || 'Žuti kartoni'}: ${d.stats.yellow_cards_home} - ${d.stats.yellow_cards_away}
${st.red_card || 'Crveni kartoni'}: ${d.stats.red_cards_home} - ${d.stats.red_cards_away}

IGRAČI:
${d.players.map(p => `[${p.id}] ${p.name} (${p.team}, ${p.position}) — ocjena: ${p.rating ?? 'N/A'}, ${st.goal || 'golovi'}: ${p.goals}, ${st.assist || 'asisti'}: ${p.assists}, minute: ${p.minutes_played}, ${st.yellow_card || 'žuti'}: ${p.yellow_cards}, ${st.red_card || 'crveni'}: ${p.red_cards}`).join('\n')}

${d.standings ? `${st.standings || 'TABELA'}:
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
 * Uses language-specific sport terms for labels.
 */
function listAllNumbers(snapshot: NormalizedSnapshot, sportTerms: Record<string, string>): string {
  const nums = new Set<string>();
  const d = snapshot.data;

  nums.add(`${d.match.score_home} (rezultat domaćin)`);
  nums.add(`${d.match.score_away} (rezultat gost)`);
  if (d.match.attendance) nums.add(`${d.match.attendance} (gledaoci)`);

  // Stats
  nums.add(`${d.stats.possession_home}/${d.stats.possession_away} (${sportTerms.possession || 'posjed'} %)`);
  nums.add(`${d.stats.shots_home}/${d.stats.shots_away} (${sportTerms.shot || 'udarci'})`);
  nums.add(`${d.stats.shots_on_target_home}/${d.stats.shots_on_target_away} (${sportTerms.shots_on_target || 'u okvir'})`);
  if (d.stats.xg_home !== null) nums.add(`${d.stats.xg_home}/${d.stats.xg_away} (xG)`);
  nums.add(`${d.stats.corners_home}/${d.stats.corners_away} (${sportTerms.corner || 'korneri'})`);
  nums.add(`${d.stats.fouls_home}/${d.stats.fouls_away} (${sportTerms.foul || 'prekršaji'})`);

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
