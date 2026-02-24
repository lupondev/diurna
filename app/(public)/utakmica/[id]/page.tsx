'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/* ── Types ── */
interface MatchTeam { id: number; name: string; logo: string; winner: boolean | null }
interface MatchEvent { min: number; extra: number | null; type: string; player: string; detail: string; team: 'home' | 'away' }
interface LineupPlayer { id: number; name: string; number: number; pos: string; grid: string | null }
interface Lineup { formation: string; startXI: LineupPlayer[]; substitutes: LineupPlayer[]; coach: { name: string; photo: string } | null }
interface Stat { label: string; home: number; away: number; pct: boolean }
interface H2HMatch { date: string; comp: string; home: string; away: string; homeScore: number; awayScore: number; homeId: number; awayId: number }

interface MatchBase {
  id: number; status: 'live' | 'ft' | 'scheduled'; statusShort: string; elapsed: number | null; date: string
  venue: string | null; city: string | null; referee: string | null
  league: { id: number; name: string; round: string | null; logo: string | null; country: string | null }
  home: MatchTeam; away: MatchTeam; goals: { home: number | null; away: number | null }
  score: { halftime: { home: number | null; away: number | null }; fulltime: { home: number | null; away: number | null } } | null
  events: MatchEvent[]
}

const TABS = ['Pregled', 'Statistika', 'Postave', 'H2H'] as const

function abbr(name: string): string {
  const map: Record<string, string> = {
    'Manchester United': 'MUN', 'Manchester City': 'MCI', 'Tottenham Hotspur': 'TOT',
    'Nottingham Forest': 'NFO', 'Wolverhampton Wanderers': 'WOL', 'West Ham United': 'WHU',
    'Newcastle United': 'NEW', 'Crystal Palace': 'CRY', 'Aston Villa': 'AVL',
    'AFC Bournemouth': 'BOU', 'Sheffield United': 'SHU', 'Atletico Madrid': 'ATM',
    'Real Madrid': 'RMA', 'Borussia Dortmund': 'BVB', 'Paris Saint Germain': 'PSG',
    'AC Milan': 'MIL', 'AS Roma': 'ROM', 'Inter': 'INT',
  }
  return map[name] || name.slice(0, 3).toUpperCase()
}

function teamColor(name: string, side: 'home' | 'away'): string {
  const c: Record<string, string> = {
    Arsenal: '#ef0107', Chelsea: '#034694', Liverpool: '#c8102e', 'Manchester City': '#6cabdd',
    'Manchester United': '#da291c', Tottenham: '#132257', Newcastle: '#241f20', 'Aston Villa': '#670e36',
    Brighton: '#0057b8', Everton: '#003399', 'West Ham': '#7a263a', Barcelona: '#004d98',
    'Real Madrid': '#febe10', 'Bayern': '#dc052d', Juventus: '#000000', PSG: '#004170', Inter: '#0068a8',
  }
  for (const [k, v] of Object.entries(c)) { if (name.includes(k)) return v }
  return side === 'home' ? '#ff5722' : '#3b82f6'
}

function teamGrad(name: string, side: 'home' | 'away'): string {
  const c = teamColor(name, side)
  const r = Math.max(0, parseInt(c.slice(1, 3), 16) - 60)
  const g = Math.max(0, parseInt(c.slice(3, 5), 16) - 60)
  const b = Math.max(0, parseInt(c.slice(5, 7), 16) - 60)
  const d = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
  return `linear-gradient(135deg, ${c}, ${d})`
}

function parseGrid(startXI: LineupPlayer[]): LineupPlayer[][] {
  const rows = new Map<number, LineupPlayer[]>()
  for (const p of startXI) {
    if (!p.grid) continue
    const row = parseInt(p.grid.split(':')[0])
    if (!rows.has(row)) rows.set(row, [])
    rows.get(row)!.push(p)
  }
  return Array.from(rows.entries()).sort((a, b) => a[0] - b[0]).map(([, players]) =>
    players.sort((a, b) => parseInt(a.grid?.split(':')[1] || '0') - parseInt(b.grid?.split(':')[1] || '0'))
  )
}

/* ── Sub-components ── */

function EventRow({ event: e, homeAbbr, awayAbbr }: { event: MatchEvent; homeAbbr: string; awayAbbr: string }) {
  const isGoal = e.type === 'goal' || e.type === 'goal-og'
  const isVar = e.type === 'var' || e.type === 'penalty-missed'
  return (
    <div className={`mc-ev${isGoal ? ' mc-ev--goal' : ''}${isVar ? ' mc-ev--disallowed' : ''}`}>
      <span className="mc-ev-min">{e.min}{e.extra ? `+${e.extra}` : ''}&apos;</span>
      {isGoal && <span className="mc-ev-icon mc-ev-icon--goal" />}
      {e.type === 'yellow' && <span className="mc-ev-icon mc-ev-icon--yellow" />}
      {e.type === 'yellow2' && <span className="mc-ev-icon mc-ev-icon--yellow" style={{ boxShadow: 'inset 2px 0 0 var(--sba-red)' }} />}
      {e.type === 'red' && <span className="mc-ev-icon mc-ev-icon--red" />}
      {e.type === 'sub' && <span className="mc-ev-icon mc-ev-icon--sub" style={{ fontSize: 12, color: '#fff' }}>↓</span>}
      {isVar && <span className="mc-ev-var">VAR</span>}
      <div className="mc-ev-body">
        <div className="mc-ev-player">{e.player}</div>
        {e.detail && <div className="mc-ev-detail">{e.detail}</div>}
      </div>
      <span className="mc-ev-team">{e.team === 'home' ? homeAbbr : awayAbbr}</span>
    </div>
  )
}

function SidebarCard({ info, dateStr, timeStr }: { info: { icon: string; label: string; value: string }[]; dateStr: string; timeStr: string }) {
  return (
    <>
      <div className="mc-card">
        <div className="mc-card-title">Info o utakmici</div>
        <div className="mc-info-row"><span className="mc-info-icon">📅</span><span className="mc-info-lbl">Datum</span><span className="mc-info-val">{dateStr}</span></div>
        <div className="mc-info-row"><span className="mc-info-icon">⏰</span><span className="mc-info-lbl">Početak</span><span className="mc-info-val">{timeStr}</span></div>
        {info.map((r) => (
          <div key={r.label} className="mc-info-row"><span className="mc-info-icon">{r.icon}</span><span className="mc-info-lbl">{r.label}</span><span className="mc-info-val">{r.value}</span></div>
        ))}
      </div>
      <div className="mc-ad">Oglas</div>
    </>
  )
}

function MiniSpinner() {
  return <div className="mc-empty"><div className="mc-spinner" style={{ width: 24, height: 24, borderWidth: 2 }} /></div>
}

/* ═══ MAIN COMPONENT ═══ */

export default function MatchPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [match, setMatch] = useState<MatchBase | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState(0)

  const [statistics, setStatistics] = useState<Stat[] | null>(null)
  const [lineups, setLineups] = useState<{ home: Lineup | null; away: Lineup | null } | null>(null)
  const [h2h, setH2h] = useState<H2HMatch[] | null>(null)
  const [tabLoading, setTabLoading] = useState(false)

  const [statsVisible, setStatsVisible] = useState(false)
  const [pitchVisible, setPitchVisible] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)
  const pitchRef = useRef<HTMLDivElement>(null)

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/match/${id}`)
      if (!res.ok) { setError('Utakmica nije pronađena'); return }
      setMatch(await res.json())
      setError(null)
    } catch { setError('Greška pri učitavanju') } finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchMatch() }, [fetchMatch])

  useEffect(() => {
    if (!match || match.status !== 'live') return
    const iv = setInterval(fetchMatch, 30000)
    return () => clearInterval(iv)
  }, [match?.status, fetchMatch])

  useEffect(() => {
    if (!match) return

    if (tab === 1 && statistics === null) {
      setTabLoading(true)
      fetch(`/api/match/${id}?section=stats`)
        .then(r => r.json())
        .then((d: Record<string, Stat[]>) => setStatistics(d.statistics ?? []))
        .catch(() => setStatistics([]))
        .finally(() => setTabLoading(false))
    }

    if (tab === 2 && lineups === null) {
      setTabLoading(true)
      fetch(`/api/match/${id}?section=lineups`)
        .then(r => r.json())
        .then((d: Record<string, { home: Lineup | null; away: Lineup | null }>) => setLineups(d.lineups ?? { home: null, away: null }))
        .catch(() => setLineups({ home: null, away: null }))
        .finally(() => setTabLoading(false))
    }

    if (tab === 3 && h2h === null) {
      setTabLoading(true)
      fetch(`/api/match/${id}?section=h2h`)
        .then(r => r.json())
        .then((d: Record<string, H2HMatch[]>) => setH2h(d.h2h ?? []))
        .catch(() => setH2h([]))
        .finally(() => setTabLoading(false))
    }
  }, [tab, match, id, statistics, lineups, h2h])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setStatsVisible(true); setPitchVisible(true); return }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (!e.isIntersecting) return; if (e.target === statsRef.current) setStatsVisible(true); if (e.target === pitchRef.current) setPitchVisible(true); obs.unobserve(e.target) })
    }, { threshold: 0.2 })
    if (statsRef.current) obs.observe(statsRef.current)
    if (pitchRef.current) obs.observe(pitchRef.current)
    return () => obs.disconnect()
  }, [tab, statistics, lineups])

  if (loading) return <main className="mc"><div className="mc-wrap" style={{padding:'80px 16px',textAlign:'center'}}><div className="mc-spinner"/></div><style>{STYLES}</style></main>
  if (error || !match) return <main className="mc"><div className="mc-wrap" style={{padding:'80px 16px',textAlign:'center'}}><p style={{color:'var(--sba-text-3)',fontSize:16}}>{error||'Utakmica nije pronađena'}</p><a href="/utakmice" style={{color:'var(--sba-accent)',marginTop:12,display:'inline-block'}}>← Nazad na utakmice</a></div><style>{STYLES}</style></main>

  const { home, away, goals, events, league, status, elapsed, score, venue, referee } = match
  const homeAbbr = abbr(home.name), awayAbbr = abbr(away.name)
  const firstHalf = events.filter(e => e.min <= 45), secondHalf = events.filter(e => e.min > 45)
  const htScore = score?.halftime
  const htStr = htScore && htScore.home !== null ? `${htScore.home} — ${htScore.away}` : null
  const roundStr = league.round ? league.round.replace('Regular Season - ', 'Kolo ') : ''

  const h2hStats = (h2h ?? []).reduce((acc, m) => {
    const hw = m.homeScore > m.awayScore, aw = m.awayScore > m.homeScore, ih = m.homeId === home.id
    if ((hw && ih) || (aw && !ih)) acc.wins++; else if ((hw && !ih) || (aw && ih)) acc.losses++; else acc.draws++
    return acc
  }, { wins: 0, draws: 0, losses: 0 })

  const sidebarInfo: { icon: string; label: string; value: string }[] = []
  if (venue) sidebarInfo.push({ icon: '🏟️', label: 'Stadion', value: venue })
  if (referee) sidebarInfo.push({ icon: '👨‍⚖️', label: 'Sudija', value: referee })
  if (match.city) sidebarInfo.push({ icon: '📍', label: 'Grad', value: match.city })

  const dateStr = new Date(match.date).toLocaleDateString('bs-BA', { day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = new Date(match.date).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Sarajevo' })

  return (
    <>
      <style>{STYLES}</style>
      <main className="mc">
        <div className="mc-wrap">
          <nav className="mc-bc">
            <a href="/">Početna</a><span className="mc-bc-sep">/</span>
            <a href="/utakmice">Utakmice</a><span className="mc-bc-sep">/</span>
            <span className="mc-bc-cur">{home.name} vs {away.name}</span>
          </nav>
          <div className="mc-layout">
            <div className="mc-main">
              <div className="mc-hdr">
                <div className="mc-comp">
                  <span className="mc-comp-name">{league.name}{roundStr ? ` · ${roundStr}` : ''}</span>
                  {status === 'live' && <span className="mc-live"><span className="mc-live-dot" />UŽIVO · {elapsed}&apos;</span>}
                  {status === 'ft' && <span className="mc-status-tag">ZAVRŠENO</span>}
                  {status === 'scheduled' && <span className="mc-status-tag">{timeStr}</span>}
                </div>
                <div className="mc-score-area">
                  <div className="mc-team">
                    {home.logo ? <img src={home.logo} alt={home.name} className="mc-badge-img" /> : <div className="mc-badge" style={{background:teamGrad(home.name,'home')}}>{homeAbbr}</div>}
                    <span className="mc-tname">{home.name}</span>
                  </div>
                  <div className="mc-sc">
                    {goals.home !== null ? <span className="mc-sc-num">{goals.home} &ndash; {goals.away}</span> : <span className="mc-sc-num mc-sc-vs">vs</span>}
                    {status === 'live' && elapsed && <span className="mc-sc-min"><span className="mc-sc-min-dot" />{elapsed}&apos;</span>}
                  </div>
                  <div className="mc-team">
                    {away.logo ? <img src={away.logo} alt={away.name} className="mc-badge-img" /> : <div className="mc-badge" style={{background:teamGrad(away.name,'away')}}>{awayAbbr}</div>}
                    <span className="mc-tname">{away.name}</span>
                  </div>
                </div>
              </div>

              <div className="mc-content">
                <div className="mc-tabs" role="tablist">
                  {TABS.map((label, i) => <button key={label} className="mc-tab" role="tab" aria-selected={tab===i} onClick={()=>setTab(i)}>{label}</button>)}
                </div>

                {tab === 0 && <div className="mc-pnl" role="tabpanel" key="pregled">
                  {events.length > 0 ? <>
                    <div className="mc-ev-title">Ključni događaji</div>
                    {firstHalf.map((e, i) => <EventRow key={`1h-${i}`} event={e} homeAbbr={homeAbbr} awayAbbr={awayAbbr} />)}
                    {htStr && <div className="mc-ht"><div className="mc-ht-line" /><span className="mc-ht-lbl">Poluvrijeme · {htStr}</span><div className="mc-ht-line" /></div>}
                    {secondHalf.map((e, i) => <EventRow key={`2h-${i}`} event={e} homeAbbr={homeAbbr} awayAbbr={awayAbbr} />)}
                  </> : <div className="mc-empty">{status === 'scheduled' ? `Utakmica počinje ${dateStr} u ${timeStr}` : 'Nema dostupnih događaja'}</div>}
                </div>}

                {tab === 1 && <div className="mc-pnl" role="tabpanel" key="stats" ref={statsRef}>
                  {tabLoading && !statistics ? <MiniSpinner /> : statistics && statistics.length > 0 ? <>
                    <div className="mc-stats-hdr"><span className="mc-stats-team">{home.name}</span><span className="mc-stats-team">{away.name}</span></div>
                    {statistics.map((s, idx) => {
                      const total = s.home + s.away, hPct = total > 0 ? (s.home/total)*100 : 50, aPct = total > 0 ? (s.away/total)*100 : 50
                      const hl = s.home > s.away, al = s.away > s.home, t = s.home === s.away
                      return <div className="mc-stat" key={s.label}>
                        <div className="mc-stat-lbl">{s.label}</div>
                        <div className="mc-stat-row">
                          <span className={`mc-stat-val mc-stat-val--home ${hl||t?'mc-stat-val--lead':'mc-stat-val--trail'}`}>{s.home}{s.pct?'%':''}</span>
                          <div className="mc-stat-bars">
                            <div className={`mc-stat-fill mc-stat-fill--home ${hl||t?'mc-stat-fill--lead':'mc-stat-fill--trail'}`} style={{width:statsVisible?`${hPct}%`:'0%',transitionDelay:statsVisible?`${idx*50}ms`:'0ms'}} />
                            <div className={`mc-stat-fill mc-stat-fill--away ${al||t?'mc-stat-fill--lead':'mc-stat-fill--trail'}`} style={{width:statsVisible?`${aPct}%`:'0%',transitionDelay:statsVisible?`${idx*50}ms`:'0ms'}} />
                          </div>
                          <span className={`mc-stat-val mc-stat-val--away ${al||t?'mc-stat-val--lead':'mc-stat-val--trail'}`}>{s.away}{s.pct?'%':''}</span>
                        </div>
                      </div>
                    })}
                  </> : <div className="mc-empty">Statistika nije dostupna</div>}
                </div>}

                {tab === 2 && <div className="mc-pnl" role="tabpanel" key="lineups">
                  {tabLoading && !lineups ? <MiniSpinner /> : lineups?.home && lineups?.away ? <>
                    <div className="mc-form-hdr">
                      <span className="mc-form-tag mc-form-tag--home"><span>{homeAbbr}</span> <span>{lineups.home.formation}</span></span>
                      <span className="mc-form-tag mc-form-tag--away"><span>{awayAbbr}</span> <span>{lineups.away.formation}</span></span>
                    </div>
                    <div className="mc-pitch" ref={pitchRef}>
                      <div className="mc-pitch-center" /><div className="mc-pitch-circle" /><div className="mc-pitch-dot" />
                      <div className="mc-pitch-box mc-pitch-box--pt mc-pitch-box--pt-t" /><div className="mc-pitch-box mc-pitch-box--pt mc-pitch-box--pt-b" />
                      <div className="mc-pitch-box mc-pitch-box--gl mc-pitch-box--gl-t" /><div className="mc-pitch-box mc-pitch-box--gl mc-pitch-box--gl-b" />
                      <div className="mc-pitch-half mc-pitch-half--home">
                        {parseGrid(lineups.home.startXI).map((row, ri) => <div key={ri} className="mc-row">
                          {row.map((p, pi) => <div key={p.id||pi} className={`mc-player${pitchVisible?' mc-player-anim':''}`} style={{animationDelay:`${(ri*4+pi)*40}ms`}}>
                            <div className="mc-pdot mc-pdot--home">{p.number}</div><span className="mc-pname">{p.name.split(' ').pop()}</span>
                          </div>)}
                        </div>)}
                      </div>
                      <div className="mc-pitch-half mc-pitch-half--away">
                        {parseGrid(lineups.away.startXI).reverse().map((row, ri) => <div key={ri} className="mc-row">
                          {row.map((p, pi) => <div key={p.id||pi} className={`mc-player${pitchVisible?' mc-player-anim':''}`} style={{animationDelay:`${(ri*4+pi+11)*40}ms`}}>
                            <div className="mc-pdot mc-pdot--away">{p.number}</div><span className="mc-pname">{p.name.split(' ').pop()}</span>
                          </div>)}
                        </div>)}
                      </div>
                    </div>
                    <div className="mc-subs"><div className="mc-subs-title">Klupa</div>
                      <div className="mc-subs-grid">
                        <div><div className="mc-subs-col-title">{home.name}</div>
                          {lineups.home.substitutes.slice(0,7).map(p => <div key={p.id||p.number} className="mc-sub"><div className="mc-sub-dot" style={{background:teamColor(home.name,'home')}}>{p.number}</div><span className="mc-sub-name">{p.name}</span></div>)}
                        </div>
                        <div><div className="mc-subs-col-title">{away.name}</div>
                          {lineups.away.substitutes.slice(0,7).map(p => <div key={p.id||p.number} className="mc-sub"><div className="mc-sub-dot" style={{background:teamColor(away.name,'away')}}>{p.number}</div><span className="mc-sub-name">{p.name}</span></div>)}
                        </div>
                      </div>
                    </div>
                  </> : <div className="mc-empty">Postave nisu dostupne</div>}
                </div>}

                {tab === 3 && <div className="mc-pnl" role="tabpanel" key="h2h">
                  {tabLoading && !h2h ? <MiniSpinner /> : h2h && h2h.length > 0 ? <>
                    <div className="mc-h2h-bar">
                      {h2hStats.wins > 0 && <div className="mc-h2h-seg mc-h2h-seg--w" style={{width:`${(h2hStats.wins/h2h.length)*100}%`}}>{h2hStats.wins}</div>}
                      {h2hStats.draws > 0 && <div className="mc-h2h-seg mc-h2h-seg--d" style={{width:`${(h2hStats.draws/h2h.length)*100}%`}}>{h2hStats.draws}</div>}
                      {h2hStats.losses > 0 && <div className="mc-h2h-seg mc-h2h-seg--l" style={{width:`${(h2hStats.losses/h2h.length)*100}%`}}>{h2hStats.losses}</div>}
                    </div>
                    <div className="mc-h2h-txt"><b>{home.name}: {h2hStats.wins}</b> · Neriješeno: {h2hStats.draws} · <b>{away.name}: {h2hStats.losses}</b></div>
                    <div className="mc-h2h-sec">Posljednjih {h2h.length} susreta</div>
                    {h2h.map((m, i) => <div key={i} className="mc-h2h-row">
                      <span className="mc-h2h-date">{m.date}</span><span className="mc-h2h-comp">{m.comp}</span>
                      <span className="mc-h2h-teams">{m.homeId===home.id?<b>{m.home}</b>:m.home}{' — '}{m.awayId===home.id?m.away:<b>{m.away}</b>}</span>
                      <span className="mc-h2h-sc">{m.homeScore} – {m.awayScore}</span>
                    </div>)}
                  </> : <div className="mc-empty">Nema H2H podataka</div>}
                </div>}
              </div>

              <div className="mc-side-mobile"><SidebarCard info={sidebarInfo} dateStr={dateStr} timeStr={timeStr} /></div>
            </div>
            <aside className="mc-side"><div className="mc-side-sticky"><SidebarCard info={sidebarInfo} dateStr={dateStr} timeStr={timeStr} /></div></aside>
          </div>
        </div>
      </main>
    </>
  )
}

const STYLES = `
.mc{font-family:var(--sba-sans);color:var(--sba-text-0);min-height:100vh}
.mc-wrap{max-width:1080px;margin:0 auto;padding:0 16px}
.mc-layout{display:flex;gap:24px}
.mc-main{flex:1;min-width:0;padding:16px 0 48px}
.mc-side{display:none}
@media(min-width:700px){.mc-side{display:flex;flex-direction:column;gap:16px;width:35%;max-width:320px;flex-shrink:0;padding:16px 0 48px}}
@media(min-width:960px){.mc-side{width:320px;gap:20px}}
.mc-side-mobile{display:flex;flex-direction:column;gap:16px;padding-top:20px}
@media(min-width:700px){.mc-side-mobile{display:none}}
.mc-side-sticky{position:sticky;top:72px;display:flex;flex-direction:column;gap:16px}

.mc-bc{font-family:var(--sba-mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--sba-text-3);margin-bottom:16px;display:flex;align-items:center;gap:8px}
.mc-bc a{color:var(--sba-text-3);text-decoration:none;transition:color .15s}
.mc-bc a:hover{color:var(--sba-accent)}
.mc-bc-sep{opacity:.4}
.mc-bc-cur{color:var(--sba-text-2)}

.mc-hdr{background:var(--sba-bg-1);border:1px solid var(--sba-border);border-radius:var(--sba-radius);overflow:hidden;margin-bottom:20px;position:relative}
.mc-hdr::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,87,34,.04) 0%,transparent 100%);pointer-events:none}
.mc-comp{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--sba-border-subtle);position:relative;z-index:1}
.mc-comp-name{font-family:var(--sba-mono);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--sba-text-3)}
.mc-live{display:flex;align-items:center;gap:6px;font-family:var(--sba-mono);font-size:10px;font-weight:700;color:var(--sba-live)}
.mc-live-dot{width:8px;height:8px;border-radius:50%;background:var(--sba-live);animation:mc-pulse 2s ease-in-out infinite}
.mc-status-tag{font-family:var(--sba-mono);font-size:10px;color:var(--sba-text-3)}
@keyframes mc-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.3)}}

.mc-score-area{display:flex;align-items:center;justify-content:center;gap:20px;padding:28px 16px 24px;position:relative;z-index:1}
@media(min-width:700px){.mc-score-area{gap:36px;padding:36px 24px 28px}}
.mc-team{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:80px}
@media(min-width:700px){.mc-team{min-width:120px}}
.mc-badge{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--sba-mono);font-size:13px;font-weight:700;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.3)}
@media(min-width:700px){.mc-badge{width:56px;height:56px;font-size:14px}}
@media(min-width:960px){.mc-badge{width:64px;height:64px;font-size:16px}}
.mc-badge-img{width:48px;height:48px;object-fit:contain}
@media(min-width:700px){.mc-badge-img{width:56px;height:56px}}
@media(min-width:960px){.mc-badge-img{width:64px;height:64px}}
.mc-tname{font-size:14px;font-weight:600;color:var(--sba-text-0);text-align:center}
@media(min-width:700px){.mc-tname{font-size:16px}}

.mc-sc{display:flex;flex-direction:column;align-items:center;gap:4px}
.mc-sc-num{font-family:var(--sba-mono);font-size:48px;font-weight:700;color:var(--sba-text-0);letter-spacing:4px;line-height:1}
@media(min-width:700px){.mc-sc-num{font-size:56px;letter-spacing:6px}}
@media(min-width:960px){.mc-sc-num{font-size:72px;letter-spacing:8px}}
.mc-sc-vs{font-size:24px!important;color:var(--sba-text-3)!important;letter-spacing:0!important}
.mc-sc-min{display:flex;align-items:center;gap:5px;font-family:var(--sba-mono);font-size:13px;font-weight:700;color:var(--sba-live)}
.mc-sc-min-dot{width:6px;height:6px;border-radius:50%;background:var(--sba-live);animation:mc-pulse 2s ease-in-out infinite}

.mc-content{background:var(--sba-bg-1);border:1px solid var(--sba-border);border-radius:var(--sba-radius);overflow:hidden}
.mc-tabs{display:flex;border-bottom:1px solid var(--sba-border);overflow-x:auto;scrollbar-width:none;scroll-snap-type:x mandatory}
.mc-tabs::-webkit-scrollbar{display:none}
.mc-tab{flex:1;min-width:0;padding:12px 8px;font-family:var(--sba-sans);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;text-align:center;color:var(--sba-text-3);background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;scroll-snap-align:center;transition:color .15s,border-color .15s}
.mc-tab:hover{color:var(--sba-text-0)}
.mc-tab[aria-selected='true']{color:var(--sba-accent);border-bottom-color:var(--sba-accent)}
.mc-pnl{padding:20px;animation:mc-fade .25s ease}
@keyframes mc-fade{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){.mc-pnl{animation:none}.mc-live-dot,.mc-sc-min-dot{animation:none}}
.mc-empty{padding:40px;text-align:center;color:var(--sba-text-3);font-size:14px}
.mc-spinner{display:inline-block;width:32px;height:32px;border:3px solid var(--sba-border);border-top-color:var(--sba-accent);border-radius:50%;animation:mc-spin .8s linear infinite}
@keyframes mc-spin{to{transform:rotate(360deg)}}

.mc-ev-title{font-family:var(--sba-mono);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--sba-text-3);margin-bottom:16px}
.mc-ev{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid var(--sba-border);transition:background .15s}
.mc-ev:last-child{border-bottom:none}
.mc-ev:hover{background:var(--sba-bg-2);margin:0 -20px;padding:12px 20px}
.mc-ev--goal{border-left:2px solid var(--sba-accent);padding-left:12px;background:rgba(255,87,34,.03)}
.mc-ev--disallowed .mc-ev-player{text-decoration:line-through;color:var(--sba-text-3)}
.mc-ev-min{font-family:var(--sba-mono);font-size:13px;font-weight:700;color:var(--sba-text-3);min-width:36px;text-align:right}
.mc-ev-icon{width:24px;height:24px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:50%}
.mc-ev-icon--goal{background:var(--sba-green)}
.mc-ev-icon--yellow{background:var(--sba-yellow);border-radius:3px;width:18px;height:24px}
.mc-ev-icon--red{background:var(--sba-red);border-radius:3px;width:18px;height:24px}
.mc-ev-icon--sub{background:var(--sba-blue)}
.mc-ev-var{display:inline-block;font-family:var(--sba-mono);font-size:10px;font-weight:700;color:#ff4444;background:rgba(255,68,68,.15);padding:2px 6px;border-radius:4px}
.mc-ev-body{flex:1;min-width:0}
.mc-ev-player{font-size:14px;font-weight:600;color:var(--sba-text-0)}
.mc-ev-detail{font-size:12px;color:var(--sba-text-3);margin-top:1px}
.mc-ev-team{font-family:var(--sba-mono);font-size:11px;color:var(--sba-text-3);background:var(--sba-bg-3);padding:3px 8px;border-radius:10px;flex-shrink:0}

.mc-ht{display:flex;align-items:center;gap:12px;padding:20px 0}
.mc-ht-line{flex:1;height:1px;background:var(--sba-border)}
.mc-ht-lbl{font-family:var(--sba-mono);font-size:12px;color:var(--sba-text-3);white-space:nowrap}

.mc-stats-hdr{display:flex;justify-content:space-between;padding-bottom:14px;margin-bottom:4px;border-bottom:1px solid var(--sba-border)}
.mc-stats-team{font-family:var(--sba-mono);font-size:12px;font-weight:700;text-transform:uppercase;color:var(--sba-text-1)}
.mc-stat{padding:14px 0;border-bottom:1px solid var(--sba-border-subtle)}
.mc-stat:last-child{border-bottom:none}
.mc-stat-lbl{font-family:var(--sba-mono);font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--sba-text-3);text-align:center;margin-bottom:8px}
.mc-stat-row{display:flex;align-items:center;gap:10px}
.mc-stat-val{font-family:var(--sba-mono);font-size:14px;font-weight:700;min-width:44px;transition:opacity .3s}
.mc-stat-val--home{text-align:right}
.mc-stat-val--away{text-align:left}
.mc-stat-val--lead{color:var(--sba-text-0)}
.mc-stat-val--trail{color:var(--sba-text-3);opacity:.5}
.mc-stat-bars{flex:1;display:flex;height:6px;background:var(--sba-border);border-radius:3px;overflow:hidden}
.mc-stat-fill{height:100%;transition:width .6s ease-out;border-radius:3px}
.mc-stat-fill--home{background:var(--sba-accent)}
.mc-stat-fill--away{background:var(--sba-blue)}
.mc-stat-fill--lead{opacity:1}
.mc-stat-fill--trail{opacity:.35}

.mc-form-hdr{display:flex;justify-content:space-between;margin-bottom:12px}
.mc-form-tag{font-family:var(--sba-mono);font-size:12px;font-weight:700}
.mc-form-tag span:first-child{margin-right:6px}
.mc-form-tag--home span:first-child{color:var(--sba-accent)}
.mc-form-tag--away span:first-child{color:var(--sba-blue)}
.mc-form-tag span:last-child{color:var(--sba-text-3)}

.mc-pitch{position:relative;border-radius:var(--sba-radius);overflow:hidden;background:linear-gradient(180deg,#1a472a 0%,#153a22 50%,#1a472a 100%);border:2px solid rgba(255,255,255,.12);padding:20px 8px}
@media(min-width:700px){.mc-pitch{padding:24px 16px}}
.mc-pitch-center{position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(255,255,255,.12);z-index:1}
.mc-pitch-circle{position:absolute;left:50%;top:50%;width:80px;height:80px;border-radius:50%;border:1px solid rgba(255,255,255,.12);transform:translate(-50%,-50%);z-index:1}
.mc-pitch-dot{position:absolute;left:50%;top:50%;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.15);transform:translate(-50%,-50%);z-index:1}
.mc-pitch-box{position:absolute;left:50%;transform:translateX(-50%);border:1px solid rgba(255,255,255,.1);z-index:1}
.mc-pitch-box--pt{width:50%;max-width:200px;height:50px}
.mc-pitch-box--pt-t{top:0;border-top:none;border-radius:0 0 4px 4px}
.mc-pitch-box--pt-b{bottom:0;border-bottom:none;border-radius:4px 4px 0 0}
.mc-pitch-box--gl{width:25%;max-width:90px;height:22px}
.mc-pitch-box--gl-t{top:0;border-top:none;border-radius:0 0 3px 3px}
.mc-pitch-box--gl-b{bottom:0;border-bottom:none;border-radius:3px 3px 0 0}

.mc-pitch-half{display:flex;flex-direction:column;gap:8px;position:relative;z-index:2}
.mc-pitch-half--home{padding-bottom:20px}
.mc-pitch-half--away{padding-top:20px}
.mc-row{display:flex;justify-content:space-evenly;align-items:center;padding:8px 0}
.mc-player{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:40px;position:relative}
.mc-pdot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--sba-mono);font-size:10px;font-weight:700;color:#fff;border:2px solid rgba(255,255,255,.3);transition:transform .15s}
@media(min-width:700px){.mc-pdot{width:32px;height:32px;font-size:12px}}
.mc-pdot--home{background:var(--sba-accent);box-shadow:0 0 8px rgba(255,87,34,.3)}
.mc-pdot--away{background:var(--sba-blue);box-shadow:0 0 8px rgba(59,130,246,.3)}
.mc-player:hover .mc-pdot{transform:scale(1.15)}
.mc-pname{font-family:var(--sba-mono);font-size:8px;font-weight:600;color:rgba(255,255,255,.85);text-align:center;max-width:58px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,.5)}
@media(min-width:700px){.mc-pname{font-size:10px;max-width:64px}}
@keyframes mc-player-in{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
.mc-player-anim{animation:mc-player-in .3s ease-out both}
@media(prefers-reduced-motion:reduce){.mc-player-anim{animation:none}}

.mc-subs{margin-top:20px;padding-top:16px;border-top:1px solid var(--sba-border)}
.mc-subs-title{font-family:var(--sba-mono);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--sba-text-3);margin-bottom:12px}
.mc-subs-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:479px){.mc-subs-grid{grid-template-columns:1fr}}
.mc-subs-col-title{font-family:var(--sba-mono);font-size:10px;font-weight:600;color:var(--sba-text-3);margin-bottom:8px}
.mc-sub{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:var(--sba-radius-sm);transition:background .15s}
.mc-sub:hover{background:var(--sba-bg-2)}
.mc-sub-dot{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--sba-mono);font-size:9px;font-weight:700;color:#fff;flex-shrink:0}
.mc-sub-name{font-size:12px;font-weight:600;color:var(--sba-text-1);flex:1}

.mc-h2h-bar{display:flex;height:32px;border-radius:4px;overflow:hidden;margin-bottom:8px}
.mc-h2h-seg{display:flex;align-items:center;justify-content:center;font-family:var(--sba-mono);font-size:12px;font-weight:700;color:#fff;transition:width .6s ease}
.mc-h2h-seg--w{background:var(--sba-accent)}
.mc-h2h-seg--d{background:var(--sba-yellow)}
.mc-h2h-seg--l{background:var(--sba-blue)}
.mc-h2h-txt{font-size:13px;color:var(--sba-text-3);margin-bottom:20px}
.mc-h2h-txt b{color:var(--sba-text-1)}
.mc-h2h-sec{font-family:var(--sba-mono);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--sba-text-3);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--sba-border)}
.mc-h2h-row{display:flex;align-items:center;gap:10px;padding:14px 0;border-bottom:1px solid var(--sba-border-subtle);transition:background .15s}
.mc-h2h-row:last-child{border-bottom:none}
.mc-h2h-row:hover{background:var(--sba-bg-2);margin:0 -20px;padding:14px 20px}
.mc-h2h-date{font-family:var(--sba-mono);font-size:12px;color:var(--sba-text-3);min-width:80px}
.mc-h2h-comp{font-family:var(--sba-mono);font-size:10px;font-weight:600;color:var(--sba-text-3);padding:2px 6px;background:var(--sba-bg-3);border-radius:4px;white-space:nowrap}
.mc-h2h-teams{flex:1;font-size:14px;color:var(--sba-text-1)}
.mc-h2h-teams b{color:var(--sba-text-0);font-weight:700}
.mc-h2h-sc{font-family:var(--sba-mono);font-size:16px;font-weight:700;min-width:50px;text-align:right}

.mc-card{background:var(--sba-bg-1);border:1px solid var(--sba-border);border-radius:var(--sba-radius);overflow:hidden}
.mc-card-title{font-family:var(--sba-mono);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--sba-text-3);padding:12px 16px;border-bottom:1px solid var(--sba-border-subtle)}
.mc-info-row{display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid var(--sba-border-subtle);font-size:12px}
.mc-info-row:last-child{border-bottom:none}
.mc-info-icon{font-size:14px;flex-shrink:0}
.mc-info-lbl{color:var(--sba-text-3);flex:1}
.mc-info-val{color:var(--sba-text-0);font-weight:600;text-align:right}
.mc-ad{height:250px;background:var(--sba-bg-1);border:1px dashed var(--sba-border);border-radius:var(--sba-radius);display:flex;align-items:center;justify-content:center;font-family:var(--sba-mono);font-size:12px;color:var(--sba-text-3)}
`
