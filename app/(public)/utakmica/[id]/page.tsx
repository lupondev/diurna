'use client'

import { useState, useEffect, useRef } from 'react'

/* ═══════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════ */

const HOME = { abbr: 'ARS', name: 'Arsenal', color: '#ef0107', gradient: 'linear-gradient(135deg,#ef0107,#9c0001)' }
const AWAY = { abbr: 'CHE', name: 'Chelsea', color: '#034694', gradient: 'linear-gradient(135deg,#034694,#001489)' }

const HOME_FORM = ['W','W','D','W','W'] as const
const AWAY_FORM = ['L','D','W','L','D'] as const

type EvType = 'goal'|'yellow'|'red'|'sub'|'var'|'disallowed'
type Side = 'home'|'away'

interface MatchEvent { min:number; type:EvType; player:string; detail:string; team:Side }

const EVENTS: MatchEvent[] = [
  { min:12, type:'goal', player:'Saka', detail:'Asist: Ødegaard', team:'home' },
  { min:24, type:'yellow', player:'Caicedo', detail:'Faul', team:'away' },
  { min:35, type:'goal', player:'Palmer', detail:'Penal', team:'away' },
  { min:41, type:'yellow', player:'Rice', detail:'Faul', team:'home' },
  { min:52, type:'sub', player:'Rodrygo', detail:'↓ Brahim Díaz', team:'home' },
  { min:56, type:'goal', player:'Havertz', detail:'Asist: Saka', team:'home' },
  { min:62, type:'sub', player:'Madueke', detail:'Za: Mudryk', team:'away' },
  { min:64, type:'yellow', player:'Sterling', detail:'Faul', team:'away' },
  { min:67, type:'disallowed', player:'Gol poništen', detail:'Ofsajd — Pavlidis', team:'away' },
]

const MOMENTUM_SEGMENTS: { dom:'home'|'away'|'neutral'; intensity:number }[] = [
  { dom:'home', intensity:0.6 },{ dom:'away', intensity:0.5 },{ dom:'home', intensity:0.7 },
  { dom:'neutral', intensity:0.3 },{ dom:'away', intensity:0.8 },{ dom:'away', intensity:0.6 },
  { dom:'home', intensity:0.5 },{ dom:'home', intensity:0.9 },{ dom:'neutral', intensity:0.3 },
  { dom:'home', intensity:0.7 },{ dom:'away', intensity:0.4 },{ dom:'home', intensity:0.6 },
  { dom:'home', intensity:0.8 },{ dom:'home', intensity:0.7 },{ dom:'away', intensity:0.5 },
  { dom:'neutral', intensity:0.3 },{ dom:'home', intensity:0.6 },{ dom:'home', intensity:0.9 },
]

const GOAL_MARKERS = [
  { min:12, segment:2, team:'home' as Side },
  { min:35, segment:7, team:'away' as Side },
  { min:56, segment:11, team:'home' as Side },
]

const STATS = [
  { label:'Posjed lopte', home:58, away:42, pct:true },
  { label:'Ukupno udaraca', home:15, away:8, pct:false },
  { label:'Udarci u okvir', home:7, away:3, pct:false },
  { label:'Udarci van okvira', home:5, away:4, pct:false },
  { label:'Korneri', home:6, away:3, pct:false },
  { label:'Prekršaji', home:11, away:14, pct:false },
  { label:'Ofsajdi', home:2, away:3, pct:false },
  { label:'Žuti kartoni', home:2, away:2, pct:false },
  { label:'Dodavanja', home:487, away:356, pct:false },
  { label:'Točnost dodavanja', home:88, away:81, pct:true },
  { label:'Spašavanja', home:2, away:5, pct:false },
  { label:'xG', home:1.87, away:0.92, pct:false },
]

type Player = { num:number; name:string; rating:number }

const HOME_XI: Player[][] = [
  [{ num:1, name:'Raya', rating:6.8 }],
  [{ num:2, name:'White', rating:7.2 },{ num:6, name:'Saliba', rating:7.8 },{ num:15, name:'Gabriel', rating:7.5 },{ num:35, name:'Zinchenko', rating:6.9 }],
  [{ num:41, name:'Rice', rating:7.4 },{ num:8, name:'Ødegaard', rating:8.1 },{ num:29, name:'Havertz', rating:8.9 }],
  [{ num:7, name:'Saka', rating:8.5 },{ num:19, name:'Trossard', rating:7.1 },{ num:11, name:'Martinelli', rating:6.8 }],
]

const AWAY_XI: Player[][] = [
  [{ num:9, name:'Jackson', rating:6.2 }],
  [{ num:20, name:'Palmer', rating:7.8 },{ num:47, name:'Gallagher', rating:6.5 },{ num:17, name:'Sterling', rating:5.9 }],
  [{ num:25, name:'Caicedo', rating:7.0 },{ num:8, name:'Fernández', rating:6.4 }],
  [{ num:24, name:'James', rating:6.8 },{ num:6, name:'Silva', rating:7.3 },{ num:26, name:'Colwill', rating:6.9 },{ num:3, name:'Cucurella', rating:6.7 }],
  [{ num:1, name:'Sánchez', rating:6.5 }],
]

const HOME_SUBS: (Player & { subMin?:number })[] = [
  { num:29, name:'Havertz', rating:8.9, subMin:52 },
  { num:14, name:'Nketiah', rating:0 },
  { num:20, name:'Jorginho', rating:0 },
  { num:18, name:'Kiwior', rating:0 },
  { num:21, name:'Tomiyasu', rating:0 },
]

const AWAY_SUBS: (Player & { subMin?:number })[] = [
  { num:10, name:'Madueke', rating:6.8, subMin:62 },
  { num:15, name:'Mudryk', rating:0, subMin:62 },
  { num:4, name:'Disasi', rating:0 },
  { num:30, name:'Chalobah', rating:0 },
  { num:28, name:'Petrović', rating:0 },
]

const TABLE_DATA = [
  { pos:1, team:'Liverpool', p:25, w:18, d:4, l:3, gd:'+36', pts:56, zone:'cl' as const, hl:false, form:['W','W','W','D','W'] },
  { pos:2, team:'Arsenal', p:25, w:17, d:5, l:3, gd:'+35', pts:55, zone:'cl' as const, hl:true, form:['W','D','W','W','W'] },
  { pos:3, team:'Man City', p:25, w:16, d:3, l:6, gd:'+28', pts:50, zone:'cl' as const, hl:false, form:['W','W','L','W','W'] },
  { pos:4, team:'Chelsea', p:25, w:14, d:4, l:7, gd:'+18', pts:45, zone:'cl' as const, hl:true, form:['W','L','W','D','L'] },
  { pos:5, team:'Aston Villa', p:25, w:13, d:5, l:7, gd:'+12', pts:43, zone:'el' as const, hl:false, form:['D','W','W','L','W'] },
  { pos:6, team:'Newcastle', p:25, w:12, d:6, l:7, gd:'+10', pts:41, zone:'conf' as const, hl:false, form:['W','L','D','W','W'] },
  { pos:7, team:'Brighton', p:25, w:11, d:6, l:8, gd:'+6', pts:38, zone:'' as const, hl:false, form:['D','L','W','W','L'] },
  { pos:8, team:'Tottenham', p:25, w:10, d:7, l:8, gd:'+4', pts:36, zone:'' as const, hl:false, form:['L','W','W','D','L'] },
  { pos:9, team:'Bournemouth', p:25, w:10, d:5, l:10, gd:'+2', pts:34, zone:'' as const, hl:false, form:['W','L','W','L','D'] },
  { pos:10, team:'Fulham', p:25, w:10, d:4, l:11, gd:'+1', pts:33, zone:'' as const, hl:false, form:['D','L','W','L','W'] },
  { pos:11, team:'West Ham', p:25, w:9, d:5, l:11, gd:'-2', pts:32, zone:'' as const, hl:false, form:['L','W','D','L','W'] },
  { pos:12, team:'Crystal Palace', p:25, w:8, d:7, l:10, gd:'-4', pts:31, zone:'' as const, hl:false, form:['D','D','L','W','L'] },
  { pos:13, team:'Man United', p:25, w:8, d:6, l:11, gd:'-6', pts:30, zone:'' as const, hl:false, form:['L','W','L','D','L'] },
  { pos:14, team:'Wolves', p:25, w:8, d:5, l:12, gd:'-10', pts:29, zone:'' as const, hl:false, form:['W','L','L','W','L'] },
  { pos:15, team:'Brentford', p:25, w:7, d:6, l:12, gd:'-8', pts:27, zone:'' as const, hl:false, form:['L','D','W','L','L'] },
  { pos:16, team:'Everton', p:25, w:6, d:7, l:12, gd:'-14', pts:25, zone:'' as const, hl:false, form:['D','L','L','D','W'] },
  { pos:17, team:'Nott. Forest', p:25, w:6, d:5, l:14, gd:'-16', pts:23, zone:'' as const, hl:false, form:['L','L','W','L','D'] },
  { pos:18, team:'Ipswich', p:25, w:4, d:7, l:14, gd:'-22', pts:18, zone:'rel' as const, hl:false, form:['L','L','L','D','L'] },
  { pos:19, team:'Leicester', p:25, w:3, d:7, l:15, gd:'-28', pts:15, zone:'rel' as const, hl:false, form:['D','L','L','D','L'] },
  { pos:20, team:'Southampton', p:25, w:2, d:6, l:17, gd:'-35', pts:11, zone:'rel' as const, hl:false, form:['L','L','L','L','L'] },
]

const H2H_DATA: { date:string; comp:string; home:string; away:string; hs:number; as:number; result:'W'|'D'|'L' }[] = [
  { date:'15.01.2026', comp:'Premier League', home:'Arsenal', away:'Chelsea', hs:2, as:0, result:'W' },
  { date:'22.10.2025', comp:'League Cup', home:'Chelsea', away:'Arsenal', hs:1, as:1, result:'D' },
  { date:'05.05.2025', comp:'Premier League', home:'Arsenal', away:'Chelsea', hs:3, as:1, result:'W' },
  { date:'18.01.2025', comp:'Premier League', home:'Chelsea', away:'Arsenal', hs:2, as:1, result:'L' },
  { date:'23.04.2024', comp:'Premier League', home:'Arsenal', away:'Chelsea', hs:5, as:0, result:'W' },
]

const SIDEBAR_INFO = [
  { icon:'🏟️', label:'Stadion', value:'Emirates Stadium' },
  { icon:'👨‍⚖️', label:'Sudija', value:'Michael Oliver 🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { icon:'🌡️', label:'Vrijeme', value:'12°C, oblačno ☁️' },
  { icon:'👥', label:'Kapacitet', value:'60.704' },
  { icon:'🎟️', label:'Gledanost', value:'60.291' },
]

const SIDEBAR_NEWS = [
  { cat:'VIJESTI', title:"Arteta: 'Danas smo pokazali karakter'", grad:'linear-gradient(135deg,#ff5722,#ff7043)', href:'/vijesti/arteta-danas-smo-pokazali-karakter' },
  { cat:'TRANSFERI', title:'Arsenal pojačava vezni red — tri imena na listi', grad:'linear-gradient(135deg,#7c3aed,#a855f7)', href:'/transferi/arsenal-pojacava-vezni-red' },
  { cat:'POVREDE', title:'Saka napustio teren — status neizvjestan', grad:'linear-gradient(135deg,#ef4444,#f87171)', href:'/povrede/saka-napustio-teren-status-neizvjestan' },
]

const ODDS = { home:'1.85', draw:'3.40', away:'4.20' }

const TABS = ['Pregled','Statistika','Postave','Tabela','H2H'] as const

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function ratingBg(r: number) {
  if (r >= 8.0) return 'var(--sba-green)'
  if (r >= 7.0) return 'var(--sba-yellow)'
  if (r >= 6.0) return 'var(--sba-text-3)'
  return 'var(--sba-red)'
}

function ratingShadow(r: number) {
  if (r >= 7.5) return '0 0 6px rgba(34,197,94,0.5)'
  return 'none'
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function MatchPage() {
  const [tab, setTab] = useState(0)
  const [statsVisible, setStatsVisible] = useState(false)
  const [momVisible, setMomVisible] = useState(false)
  const [pitchVisible, setPitchVisible] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)
  const momRef = useRef<HTMLDivElement>(null)
  const pitchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setStatsVisible(true)
      setMomVisible(true)
      setPitchVisible(true)
      return
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        if (e.target === statsRef.current) setStatsVisible(true)
        if (e.target === momRef.current) setMomVisible(true)
        if (e.target === pitchRef.current) setPitchVisible(true)
        obs.unobserve(e.target)
      })
    }, { threshold: 0.2 })
    if (statsRef.current) obs.observe(statsRef.current)
    if (momRef.current) obs.observe(momRef.current)
    if (pitchRef.current) obs.observe(pitchRef.current)
    return () => obs.disconnect()
  }, [tab])

  const h2h = {
    wins: H2H_DATA.filter((m) => m.result === 'W').length,
    draws: H2H_DATA.filter((m) => m.result === 'D').length,
    losses: H2H_DATA.filter((m) => m.result === 'L').length,
  }
  const h2hTotal = H2H_DATA.length

  const firstHalf = EVENTS.filter((e) => e.min <= 45)
  const secondHalf = EVENTS.filter((e) => e.min > 45)

  let playerIdx = 0

  return (
    <>
      <style>{`
/* ── Match Center Styles ── */
.mc { font-family: var(--sba-sans); color: var(--sba-text-0); min-height: 100vh; }
.mc-wrap { max-width: 1080px; margin: 0 auto; padding: 0 16px; }
.mc-layout { display: flex; gap: 24px; }
.mc-main { flex: 1; min-width: 0; padding: 16px 0 48px; }
.mc-side { display: none; }

@media (min-width: 700px) {
  .mc-layout { gap: 20px; }
  .mc-side { display: flex; flex-direction: column; gap: 16px; width: 35%; max-width: 320px; flex-shrink: 0; padding: 16px 0 48px; }
}
@media (min-width: 960px) {
  .mc-side { width: 320px; gap: 20px; }
}

/* Breadcrumb */
.mc-bc { font-family: var(--sba-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sba-text-3); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.mc-bc a { color: var(--sba-text-3); text-decoration: none; transition: color var(--sba-ease); }
.mc-bc a:hover { color: var(--sba-accent); }
.mc-bc-sep { opacity: 0.4; }
.mc-bc-cur { color: var(--sba-text-2); }

/* ═══ SCORE HEADER ═══ */
.mc-hdr {
  background: var(--sba-bg-1);
  border: 1px solid var(--sba-border);
  border-radius: var(--sba-radius);
  overflow: hidden;
  margin-bottom: 20px;
  position: relative;
}
.mc-hdr::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255,87,34,0.04) 0%, transparent 100%);
  pointer-events: none;
}

/* Competition bar */
.mc-comp { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid var(--sba-border-subtle); position: relative; z-index: 1; }
.mc-comp-name { font-family: var(--sba-mono); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sba-text-3); }
.mc-live { display: flex; align-items: center; gap: 6px; font-family: var(--sba-mono); font-size: 10px; font-weight: 700; color: var(--sba-live); }
.mc-live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--sba-live); animation: mc-pulse 2s ease-in-out infinite; }
@keyframes mc-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(1.3); } }

/* Scoreboard */
.mc-score-area { display: flex; align-items: center; justify-content: center; gap: 20px; padding: 28px 16px 20px; position: relative; z-index: 1; }
@media (min-width: 700px) { .mc-score-area { gap: 36px; padding: 36px 24px 24px; } }

.mc-team { display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 80px; }
@media (min-width: 700px) { .mc-team { min-width: 120px; } }

.mc-badge {
  width: 48px; height: 48px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--sba-mono); font-size: 13px; font-weight: 700; color: #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}
@media (min-width: 700px) { .mc-badge { width: 56px; height: 56px; font-size: 14px; } }
@media (min-width: 960px) { .mc-badge { width: 64px; height: 64px; font-size: 16px; } }

.mc-tname { font-size: 14px; font-weight: 600; color: var(--sba-text-0); text-align: center; }
@media (min-width: 700px) { .mc-tname { font-size: 16px; } }

/* Form dots */
.mc-form { display: flex; gap: 3px; }
.mc-fdot { width: 16px; height: 16px; border-radius: 50%; font-family: var(--sba-mono); font-size: 8px; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; }
@media (min-width: 960px) { .mc-fdot { width: 20px; height: 20px; font-size: 9px; } }
.mc-fdot-w { background: var(--sba-green); }
.mc-fdot-d { background: var(--sba-yellow); }
.mc-fdot-l { background: var(--sba-red); }

/* Score block */
.mc-sc { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.mc-sc-num { font-family: var(--sba-mono); font-size: 48px; font-weight: 700; color: var(--sba-text-0); letter-spacing: 4px; line-height: 1; }
@media (min-width: 700px) { .mc-sc-num { font-size: 56px; letter-spacing: 6px; } }
@media (min-width: 960px) { .mc-sc-num { font-size: 72px; letter-spacing: 8px; } }
.mc-sc-min { display: flex; align-items: center; gap: 5px; font-family: var(--sba-mono); font-size: 13px; font-weight: 700; color: var(--sba-live); }
.mc-sc-min-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sba-live); animation: mc-pulse 2s ease-in-out infinite; }
.mc-sc-agg { font-family: var(--sba-mono); font-size: 11px; color: var(--sba-text-3); margin-top: 2px; }

/* Form label row */
.mc-form-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; border-top: 1px solid var(--sba-border-subtle); position: relative; z-index: 1; }
@media (min-width: 700px) { .mc-form-row { padding: 10px 40px; } }
.mc-form-lbl { font-family: var(--sba-mono); font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--sba-text-3); }

/* ═══ TABS ═══ */
.mc-content { background: var(--sba-bg-1); border: 1px solid var(--sba-border); border-radius: var(--sba-radius); overflow: hidden; }
.mc-tabs { display: flex; border-bottom: 1px solid var(--sba-border); overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; scroll-snap-type: x mandatory; }
.mc-tabs::-webkit-scrollbar { display: none; }
.mc-tab {
  flex: 1; min-width: 0; padding: 12px 8px;
  font-family: var(--sba-sans); font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em; text-align: center;
  color: var(--sba-text-3); background: none; border: none;
  border-bottom: 2px solid transparent; cursor: pointer;
  white-space: nowrap; scroll-snap-align: center;
  transition: color var(--sba-ease), border-color var(--sba-ease);
}
.mc-tab:hover { color: var(--sba-text-0); }
.mc-tab[aria-selected='true'] { color: var(--sba-accent); border-bottom-color: var(--sba-accent); }
.mc-pnl { padding: 20px; animation: mc-fade 0.25s ease; }
@keyframes mc-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .mc-pnl { animation: none; }
  .mc-live-dot, .mc-sc-min-dot { animation: none; }
}

/* ═══ PREGLED — EVENTS ═══ */
.mc-ev-title { font-family: var(--sba-mono); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--sba-text-3); margin-bottom: 16px; }
.mc-ev { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--sba-border); transition: background 0.15s ease; }
.mc-ev:last-child { border-bottom: none; }
.mc-ev:hover { background: var(--sba-bg-2); margin: 0 -20px; padding: 12px 20px; }
.mc-ev--goal { border-left: 2px solid var(--sba-accent); padding-left: 12px; background: rgba(255,87,34,0.03); }
.mc-ev--goal:hover { background: rgba(255,87,34,0.06); }
.mc-ev--disallowed .mc-ev-player { text-decoration: line-through; color: var(--sba-text-3); }

.mc-ev-min { font-family: var(--sba-mono); font-size: 13px; font-weight: 700; color: var(--sba-text-3); min-width: 36px; text-align: right; }
.mc-ev-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; }
.mc-ev-icon--goal { background: var(--sba-green); }
.mc-ev-icon--yellow { background: var(--sba-yellow); border-radius: 3px; width: 18px; height: 24px; }
.mc-ev-icon--red { background: var(--sba-red); border-radius: 3px; width: 18px; height: 24px; }
.mc-ev-icon--sub { background: var(--sba-blue); }
.mc-ev-icon--disallowed { background: var(--sba-text-3); }
.mc-ev-var { display: inline-block; font-family: var(--sba-mono); font-size: 10px; font-weight: 700; color: #ff4444; background: rgba(255,68,68,0.15); padding: 2px 6px; border-radius: 4px; }

.mc-ev-body { flex: 1; min-width: 0; }
.mc-ev-player { font-size: 14px; font-weight: 600; color: var(--sba-text-0); }
.mc-ev-detail { font-size: 12px; color: var(--sba-text-3); margin-top: 1px; }
.mc-ev-team { font-family: var(--sba-mono); font-size: 11px; color: var(--sba-text-3); background: var(--sba-bg-3); padding: 3px 8px; border-radius: 10px; flex-shrink: 0; }

/* Halftime */
.mc-ht { display: flex; align-items: center; gap: 12px; padding: 20px 0; }
.mc-ht-line { flex: 1; height: 1px; background: var(--sba-border); }
.mc-ht-lbl { font-family: var(--sba-mono); font-size: 12px; color: var(--sba-text-3); white-space: nowrap; }

/* Momentum */
.mc-mom-title { font-family: var(--sba-mono); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--sba-text-3); margin-bottom: 12px; margin-top: 24px; }
.mc-mom-teams { display: flex; justify-content: space-between; font-family: var(--sba-mono); font-size: 11px; color: var(--sba-text-3); margin-bottom: 6px; }
.mc-mom-wrap { position: relative; }
.mc-mom-markers { display: flex; position: relative; height: 16px; margin-bottom: 4px; }
.mc-mom-marker { position: absolute; width: 8px; height: 8px; border-radius: 50%; top: 4px; transform: translateX(-50%); }
.mc-mom-bar { display: flex; gap: 2px; height: 40px; border-radius: 4px; overflow: hidden; }
.mc-mom-seg { flex: 1; transition: opacity 0.6s ease; border-radius: 2px; }
.mc-mom-seg--home { background: var(--sba-accent); }
.mc-mom-seg--away { background: var(--sba-blue); }
.mc-mom-seg--neutral { background: var(--sba-border); }
.mc-mom-labels { display: flex; justify-content: space-between; margin-top: 6px; font-family: var(--sba-mono); font-size: 10px; color: var(--sba-text-3); }

/* ═══ STATISTIKA ═══ */
.mc-stats-hdr { display: flex; justify-content: space-between; padding-bottom: 14px; margin-bottom: 4px; border-bottom: 1px solid var(--sba-border); }
.mc-stats-team { font-family: var(--sba-mono); font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--sba-text-1); }

.mc-stat { padding: 14px 0; border-bottom: 1px solid var(--sba-border-subtle); }
.mc-stat:last-child { border-bottom: none; }
.mc-stat-lbl { font-family: var(--sba-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--sba-text-3); text-align: center; margin-bottom: 8px; }
.mc-stat-row { display: flex; align-items: center; gap: 10px; }
.mc-stat-val { font-family: var(--sba-mono); font-size: 14px; font-weight: 700; min-width: 44px; transition: opacity 0.3s; }
.mc-stat-val--home { text-align: right; }
.mc-stat-val--away { text-align: left; }
.mc-stat-val--lead { color: var(--sba-text-0); }
.mc-stat-val--trail { color: var(--sba-text-3); opacity: 0.5; }
.mc-stat-bars { flex: 1; display: flex; height: 6px; background: var(--sba-border); border-radius: 3px; overflow: hidden; }
.mc-stat-fill { height: 100%; transition: width 0.6s ease-out; border-radius: 3px; }
.mc-stat-fill--home { background: var(--sba-accent); }
.mc-stat-fill--away { background: var(--sba-blue); }
.mc-stat-fill--lead { opacity: 1; }
.mc-stat-fill--trail { opacity: 0.35; }

/* ═══ POSTAVE — PITCH ═══ */
.mc-form-hdr { display: flex; justify-content: space-between; margin-bottom: 12px; }
.mc-form-tag { font-family: var(--sba-mono); font-size: 12px; font-weight: 700; }
.mc-form-tag span:first-child { margin-right: 6px; }
.mc-form-tag--home span:first-child { color: var(--sba-accent); }
.mc-form-tag--away span:first-child { color: var(--sba-blue); }
.mc-form-tag span:last-child { color: var(--sba-text-3); }

.mc-pitch {
  position: relative; border-radius: var(--sba-radius); overflow: hidden;
  background: linear-gradient(180deg, #1a472a 0%, #153a22 50%, #1a472a 100%);
  border: 2px solid rgba(255,255,255,0.12); padding: 20px 8px;
  aspect-ratio: auto;
}
@media (min-width: 700px) { .mc-pitch { padding: 24px 16px; } }

/* Pitch markings */
.mc-pitch-center { position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: rgba(255,255,255,0.12); z-index: 1; }
.mc-pitch-circle { position: absolute; left: 50%; top: 50%; width: 80px; height: 80px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.12); transform: translate(-50%,-50%); z-index: 1; }
.mc-pitch-dot { position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.15); transform: translate(-50%,-50%); z-index: 1; }
.mc-pitch-box { position: absolute; left: 50%; transform: translateX(-50%); border: 1px solid rgba(255,255,255,0.1); z-index: 1; }
.mc-pitch-box--pt { width: 50%; max-width: 200px; height: 50px; }
.mc-pitch-box--pt-t { top: 0; border-top: none; border-radius: 0 0 4px 4px; }
.mc-pitch-box--pt-b { bottom: 0; border-bottom: none; border-radius: 4px 4px 0 0; }
.mc-pitch-box--gl { width: 25%; max-width: 90px; height: 22px; }
.mc-pitch-box--gl-t { top: 0; border-top: none; border-radius: 0 0 3px 3px; }
.mc-pitch-box--gl-b { bottom: 0; border-bottom: none; border-radius: 3px 3px 0 0; }

/* Corner arcs */
.mc-pitch-corner { position: absolute; width: 16px; height: 16px; border: 1px solid rgba(255,255,255,0.1); z-index: 1; }
.mc-pitch-corner--tl { top: -1px; left: -1px; border-top: none; border-left: none; border-radius: 0 0 16px 0; }
.mc-pitch-corner--tr { top: -1px; right: -1px; border-top: none; border-right: none; border-radius: 0 0 0 16px; }
.mc-pitch-corner--bl { bottom: -1px; left: -1px; border-bottom: none; border-left: none; border-radius: 0 16px 0 0; }
.mc-pitch-corner--br { bottom: -1px; right: -1px; border-bottom: none; border-right: none; border-radius: 16px 0 0 0; }

.mc-pitch-half { display: flex; flex-direction: column; gap: 8px; position: relative; z-index: 2; }
.mc-pitch-half--home { padding-bottom: 20px; }
.mc-pitch-half--away { padding-top: 20px; }
.mc-row { display: flex; justify-content: space-evenly; align-items: center; padding: 8px 0; }

.mc-player { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 40px; position: relative; }
.mc-pdot {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--sba-mono); font-size: 10px; font-weight: 700; color: #fff;
  border: 2px solid rgba(255,255,255,0.3);
  transition: transform 0.15s ease;
}
@media (min-width: 700px) { .mc-pdot { width: 32px; height: 32px; font-size: 12px; } }
.mc-pdot--home { background: var(--sba-accent); box-shadow: 0 0 8px rgba(255,87,34,0.3); }
.mc-pdot--away { background: var(--sba-blue); box-shadow: 0 0 8px rgba(59,130,246,0.3); }
.mc-player:hover .mc-pdot { transform: scale(1.15); }

.mc-pname { font-family: var(--sba-mono); font-size: 8px; font-weight: 600; color: rgba(255,255,255,0.85); text-align: center; max-width: 58px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
@media (min-width: 700px) { .mc-pname { font-size: 10px; max-width: 64px; } }

.mc-rating { position: absolute; top: -4px; right: -4px; font-family: var(--sba-mono); font-size: 9px; font-weight: 700; color: #fff; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; line-height: 1; }

/* Player appear animation */
@keyframes mc-player-in { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
.mc-player-anim { animation: mc-player-in 0.3s ease-out both; }
@media (prefers-reduced-motion: reduce) { .mc-player-anim { animation: none; } }

/* Substitutes */
.mc-subs { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--sba-border); }
.mc-subs-title { font-family: var(--sba-mono); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sba-text-3); margin-bottom: 12px; }
.mc-subs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 479px) { .mc-subs-grid { grid-template-columns: 1fr; } }
.mc-subs-col-title { font-family: var(--sba-mono); font-size: 10px; font-weight: 600; color: var(--sba-text-3); margin-bottom: 8px; }
.mc-sub { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--sba-radius-sm); transition: background 0.15s; }
.mc-sub:hover { background: var(--sba-bg-2); }
.mc-sub-dot { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--sba-mono); font-size: 9px; font-weight: 700; color: #fff; flex-shrink: 0; }
.mc-sub-name { font-size: 12px; font-weight: 600; color: var(--sba-text-1); flex: 1; }
.mc-sub-in { font-family: var(--sba-mono); font-size: 10px; color: var(--sba-green); }
.mc-sub-rating { font-family: var(--sba-mono); font-size: 9px; font-weight: 700; color: #fff; padding: 1px 5px; border-radius: 3px; }

/* ═══ TABELA ═══ */
.mc-tbl-wrap { overflow-x: auto; scrollbar-width: thin; }
.mc-tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
.mc-tbl th { font-family: var(--sba-mono); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--sba-text-3); padding: 10px 6px; text-align: center; border-bottom: 1px solid var(--sba-border); position: sticky; top: 0; background: var(--sba-bg-1); z-index: 2; }
.mc-tbl th:nth-child(1) { text-align: left; padding-left: 12px; width: 28px; }
.mc-tbl th:nth-child(2) { text-align: left; }
.mc-tbl td { padding: 10px 6px; text-align: center; border-bottom: 1px solid var(--sba-border-subtle); color: var(--sba-text-2); }
.mc-tbl td:nth-child(1) { text-align: left; padding-left: 8px; font-family: var(--sba-mono); font-weight: 700; color: var(--sba-text-3); width: 28px; }
.mc-tbl td:nth-child(2) { text-align: left; font-weight: 600; color: var(--sba-text-0); }
.mc-tbl-pts { font-family: var(--sba-mono); font-weight: 700 !important; color: var(--sba-text-0) !important; }
.mc-tbl-hl td { background: rgba(255,87,34,0.05); }
.mc-tbl-hl td:nth-child(2) { color: var(--sba-accent) !important; font-weight: 700; }

/* Zone borders */
.mc-z-cl td:first-child { box-shadow: inset 3px 0 0 var(--sba-blue); }
.mc-z-el td:first-child { box-shadow: inset 3px 0 0 var(--sba-yellow); }
.mc-z-conf td:first-child { box-shadow: inset 3px 0 0 var(--sba-green); }
.mc-z-rel td:first-child { box-shadow: inset 3px 0 0 var(--sba-red); }

/* Form column */
.mc-tbl-form { display: none; }
@media (min-width: 640px) { .mc-tbl-form { display: table-cell; } }
.mc-tbl-form .mc-form { justify-content: center; }
.mc-tbl-form .mc-fdot { width: 8px; height: 8px; font-size: 0; }

/* Zone legend */
.mc-zone-leg { display: flex; flex-wrap: wrap; gap: 14px; padding-top: 14px; font-family: var(--sba-mono); font-size: 11px; color: var(--sba-text-3); }
.mc-zone-leg-item { display: flex; align-items: center; gap: 5px; }
.mc-zone-leg-dot { width: 8px; height: 8px; border-radius: 50%; }

/* ═══ H2H ═══ */
.mc-h2h-bar { display: flex; height: 32px; border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
.mc-h2h-seg { display: flex; align-items: center; justify-content: center; font-family: var(--sba-mono); font-size: 12px; font-weight: 700; color: #fff; transition: width 0.6s ease; }
.mc-h2h-seg--w { background: var(--sba-accent); }
.mc-h2h-seg--d { background: var(--sba-yellow); }
.mc-h2h-seg--l { background: var(--sba-blue); }
.mc-h2h-txt { font-size: 13px; color: var(--sba-text-3); margin-bottom: 20px; }
.mc-h2h-txt b { color: var(--sba-text-1); }

.mc-h2h-sec { font-family: var(--sba-mono); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sba-text-3); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--sba-border); }

.mc-h2h-row { display: flex; align-items: center; gap: 10px; padding: 14px 0; border-bottom: 1px solid var(--sba-border-subtle); transition: background 0.15s; }
.mc-h2h-row:last-child { border-bottom: none; }
.mc-h2h-row:hover { background: var(--sba-bg-2); margin: 0 -20px; padding: 14px 20px; }
.mc-h2h-date { font-family: var(--sba-mono); font-size: 12px; color: var(--sba-text-3); min-width: 80px; }
.mc-h2h-comp { font-family: var(--sba-mono); font-size: 10px; font-weight: 600; color: var(--sba-text-3); padding: 2px 6px; background: var(--sba-bg-3); border-radius: 4px; white-space: nowrap; }
.mc-h2h-teams { flex: 1; font-size: 14px; color: var(--sba-text-1); }
.mc-h2h-teams b { color: var(--sba-text-0); font-weight: 700; }
.mc-h2h-sc { font-family: var(--sba-mono); font-size: 16px; font-weight: 700; min-width: 50px; text-align: right; }

/* ═══ SIDEBAR ═══ */
.mc-side-sticky { position: sticky; top: 72px; display: flex; flex-direction: column; gap: 16px; }
.mc-card { background: var(--sba-bg-1); border: 1px solid var(--sba-border); border-radius: var(--sba-radius); overflow: hidden; }
.mc-card-title { font-family: var(--sba-mono); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sba-text-3); padding: 12px 16px; border-bottom: 1px solid var(--sba-border-subtle); }

/* Info rows */
.mc-info-row { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-bottom: 1px solid var(--sba-border-subtle); font-size: 12px; }
.mc-info-row:last-child { border-bottom: none; }
.mc-info-icon { font-size: 14px; flex-shrink: 0; }
.mc-info-lbl { color: var(--sba-text-3); flex: 1; }
.mc-info-val { color: var(--sba-text-0); font-weight: 600; text-align: right; }

/* Capacity */
.mc-cap { padding: 8px 16px 14px; }
.mc-cap-bar { height: 4px; background: var(--sba-border); border-radius: 2px; overflow: hidden; margin-bottom: 4px; }
.mc-cap-fill { height: 100%; background: var(--sba-green); border-radius: 2px; transition: width 0.6s ease; }
.mc-cap-lbl { font-family: var(--sba-mono); font-size: 10px; color: var(--sba-green); text-align: right; }

/* Odds */
.mc-odds-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
.mc-odds-cell {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 12px 8px; border-right: 1px solid var(--sba-border-subtle);
  cursor: pointer; transition: background 0.15s, border-color 0.15s;
  border: 1px solid transparent; margin: -1px;
}
.mc-odds-cell:last-child { border-right-color: transparent; }
.mc-odds-cell:hover { background: var(--sba-bg-2); border-color: var(--sba-accent); border-radius: 6px; z-index: 1; }
.mc-odds-lbl { font-family: var(--sba-mono); font-size: 11px; color: var(--sba-text-3); }
.mc-odds-val { font-family: var(--sba-mono); font-size: 18px; font-weight: 700; color: var(--sba-text-0); }
.mc-odds-foot { font-family: var(--sba-mono); font-size: 9px; color: var(--sba-text-3); text-align: center; padding: 8px; }

/* Ad placeholder */
.mc-ad { height: 250px; background: var(--sba-bg-1); border: 1px dashed var(--sba-border); border-radius: var(--sba-radius); display: flex; align-items: center; justify-content: center; font-family: var(--sba-mono); font-size: 12px; color: var(--sba-text-3); }

/* Related news */
.mc-news-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; text-decoration: none; border-bottom: 1px solid var(--sba-border-subtle); transition: background 0.15s; }
.mc-news-item:last-child { border-bottom: none; }
.mc-news-item:hover { background: var(--sba-bg-2); }
.mc-news-thumb { width: 40px; height: 40px; border-radius: var(--sba-radius); flex-shrink: 0; }
.mc-news-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.mc-news-cat { font-family: var(--sba-mono); font-size: 10px; font-weight: 600; text-transform: uppercase; color: var(--sba-accent); }
.mc-news-title { font-size: 13px; font-weight: 600; color: var(--sba-text-0); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.mc-news-item:hover .mc-news-title { color: var(--sba-accent); }

/* ═══ Mobile sidebar below main ═══ */
.mc-side-mobile { display: flex; flex-direction: column; gap: 16px; padding-bottom: 48px; }
@media (min-width: 700px) { .mc-side-mobile { display: none; } }
      `}</style>

      <main className="mc">
        <div className="mc-wrap">

          {/* Breadcrumb */}
          <nav className="mc-bc">
            <a href="/">Sport.ba</a>
            <span className="mc-bc-sep">/</span>
            <a href="/utakmice">Utakmice</a>
            <span className="mc-bc-sep">/</span>
            <span className="mc-bc-cur">{HOME.name} vs {AWAY.name}</span>
          </nav>

          <div className="mc-layout">
            {/* ══════════ MAIN ══════════ */}
            <div className="mc-main">

              {/* Score Header */}
              <div className="mc-hdr">
                <div className="mc-comp">
                  <span className="mc-comp-name">Premier League &middot; Kolo 25</span>
                  <span className="mc-live">
                    <span className="mc-live-dot" />
                    UŽIVO &middot; 67&apos;
                  </span>
                </div>

                <div className="mc-score-area">
                  <div className="mc-team">
                    <div className="mc-badge" style={{ background: HOME.gradient }}>{HOME.abbr}</div>
                    <span className="mc-tname">{HOME.name}</span>
                    <div className="mc-form">
                      {HOME_FORM.map((r, i) => (
                        <span key={i} className={`mc-fdot mc-fdot-${r.toLowerCase()}`}>
                          {r === 'W' ? 'P' : r === 'D' ? 'N' : 'I'}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mc-sc">
                    <span className="mc-sc-num">2 &ndash; 1</span>
                    <span className="mc-sc-min">
                      <span className="mc-sc-min-dot" />
                      67&apos;
                    </span>
                    <span className="mc-sc-agg">Agg: 2 &ndash; 1</span>
                  </div>

                  <div className="mc-team">
                    <div className="mc-badge" style={{ background: AWAY.gradient }}>{AWAY.abbr}</div>
                    <span className="mc-tname">{AWAY.name}</span>
                    <div className="mc-form">
                      {AWAY_FORM.map((r, i) => (
                        <span key={i} className={`mc-fdot mc-fdot-${r.toLowerCase()}`}>
                          {r === 'W' ? 'P' : r === 'D' ? 'N' : 'I'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mc-form-row">
                  <div className="mc-form">
                    {HOME_FORM.map((r, i) => (
                      <span key={i} className={`mc-fdot mc-fdot-${r.toLowerCase()}`}>
                        {r === 'W' ? 'P' : r === 'D' ? 'N' : 'I'}
                      </span>
                    ))}
                  </div>
                  <span className="mc-form-lbl">FORMA</span>
                  <div className="mc-form">
                    {AWAY_FORM.map((r, i) => (
                      <span key={i} className={`mc-fdot mc-fdot-${r.toLowerCase()}`}>
                        {r === 'W' ? 'P' : r === 'D' ? 'N' : 'I'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="mc-content">
                <div className="mc-tabs" role="tablist">
                  {TABS.map((label, i) => (
                    <button key={label} className="mc-tab" role="tab" aria-selected={tab === i} onClick={() => setTab(i)}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* ═══ PREGLED ═══ */}
                {tab === 0 && (
                  <div className="mc-pnl" role="tabpanel" key="pregled">
                    <div className="mc-ev-title">Ključni događaji</div>

                    {/* First Half */}
                    {firstHalf.map((e, i) => (
                      <div key={i} className={`mc-ev${e.type === 'goal' ? ' mc-ev--goal' : ''}${e.type === 'disallowed' ? ' mc-ev--disallowed' : ''}`}>
                        <span className="mc-ev-min">{e.min}&apos;</span>
                        {e.type === 'goal' && <span className="mc-ev-icon mc-ev-icon--goal" />}
                        {e.type === 'yellow' && <span className="mc-ev-icon mc-ev-icon--yellow" />}
                        {e.type === 'red' && <span className="mc-ev-icon mc-ev-icon--red" />}
                        {e.type === 'sub' && <span className="mc-ev-icon mc-ev-icon--sub" style={{ fontSize: 12, color: '#fff' }}>↓</span>}
                        {e.type === 'var' && <span className="mc-ev-var">VAR</span>}
                        {e.type === 'disallowed' && <span className="mc-ev-var">VAR</span>}
                        <div className="mc-ev-body">
                          <div className="mc-ev-player">{e.player}</div>
                          {e.detail && <div className="mc-ev-detail">{e.detail}</div>}
                        </div>
                        <span className="mc-ev-team">{e.team === 'home' ? HOME.abbr : AWAY.abbr}</span>
                      </div>
                    ))}

                    {/* Halftime */}
                    <div className="mc-ht">
                      <div className="mc-ht-line" />
                      <span className="mc-ht-lbl">Poluvrijeme &middot; 1 &mdash; 1</span>
                      <div className="mc-ht-line" />
                    </div>

                    {/* Second Half */}
                    {secondHalf.map((e, i) => (
                      <div key={i} className={`mc-ev${e.type === 'goal' ? ' mc-ev--goal' : ''}${e.type === 'disallowed' ? ' mc-ev--disallowed' : ''}`}>
                        <span className="mc-ev-min">{e.min}&apos;</span>
                        {e.type === 'goal' && <span className="mc-ev-icon mc-ev-icon--goal" />}
                        {e.type === 'yellow' && <span className="mc-ev-icon mc-ev-icon--yellow" />}
                        {e.type === 'red' && <span className="mc-ev-icon mc-ev-icon--red" />}
                        {e.type === 'sub' && <span className="mc-ev-icon mc-ev-icon--sub" style={{ fontSize: 12, color: '#fff' }}>↓</span>}
                        {e.type === 'var' && <span className="mc-ev-var">VAR</span>}
                        {e.type === 'disallowed' && <span className="mc-ev-var">VAR</span>}
                        <div className="mc-ev-body">
                          <div className="mc-ev-player">{e.player}</div>
                          {e.detail && <div className="mc-ev-detail">{e.detail}</div>}
                        </div>
                        <span className="mc-ev-team">{e.team === 'home' ? HOME.abbr : AWAY.abbr}</span>
                      </div>
                    ))}

                    {/* Momentum */}
                    <div className="mc-mom-title">Pritisak po minutama</div>
                    <div className="mc-mom-teams">
                      <span>{HOME.name}</span>
                      <span>{AWAY.name}</span>
                    </div>
                    <div className="mc-mom-wrap" ref={momRef}>
                      {/* Goal markers */}
                      <div className="mc-mom-markers">
                        {GOAL_MARKERS.map((g, i) => (
                          <div
                            key={i}
                            className="mc-mom-marker"
                            style={{
                              left: `${(g.segment / MOMENTUM_SEGMENTS.length) * 100 + (100 / MOMENTUM_SEGMENTS.length / 2)}%`,
                              background: g.team === 'home' ? 'var(--sba-accent)' : 'var(--sba-blue)',
                            }}
                          />
                        ))}
                      </div>
                      <div className="mc-mom-bar">
                        {MOMENTUM_SEGMENTS.map((seg, i) => (
                          <div
                            key={i}
                            className={`mc-mom-seg mc-mom-seg--${seg.dom}`}
                            style={{
                              opacity: momVisible ? seg.intensity : 0,
                              transitionDelay: momVisible ? `${i * 50}ms` : '0ms',
                            }}
                          />
                        ))}
                      </div>
                      <div className="mc-mom-labels">
                        <span>0&apos;</span>
                        <span>HT</span>
                        <span>90&apos;</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ STATISTIKA ═══ */}
                {tab === 1 && (
                  <div className="mc-pnl" role="tabpanel" key="stats" ref={statsRef}>
                    <div className="mc-stats-hdr">
                      <span className="mc-stats-team">{HOME.name}</span>
                      <span className="mc-stats-team">{AWAY.name}</span>
                    </div>
                    {STATS.map((s, idx) => {
                      const hv = Number(s.home)
                      const av = Number(s.away)
                      const total = hv + av
                      const hPct = total > 0 ? (hv / total) * 100 : 50
                      const aPct = total > 0 ? (av / total) * 100 : 50
                      const homeLeads = hv > av
                      const awayLeads = av > hv
                      const tied = hv === av
                      return (
                        <div className="mc-stat" key={s.label}>
                          <div className="mc-stat-lbl">{s.label}</div>
                          <div className="mc-stat-row">
                            <span className={`mc-stat-val mc-stat-val--home ${homeLeads || tied ? 'mc-stat-val--lead' : 'mc-stat-val--trail'}`}>
                              {s.home}{s.pct ? '%' : ''}
                            </span>
                            <div className="mc-stat-bars">
                              <div
                                className={`mc-stat-fill mc-stat-fill--home ${homeLeads || tied ? 'mc-stat-fill--lead' : 'mc-stat-fill--trail'}`}
                                style={{
                                  width: statsVisible ? `${hPct}%` : '0%',
                                  transitionDelay: statsVisible ? `${idx * 50}ms` : '0ms',
                                }}
                              />
                              <div
                                className={`mc-stat-fill mc-stat-fill--away ${awayLeads || tied ? 'mc-stat-fill--lead' : 'mc-stat-fill--trail'}`}
                                style={{
                                  width: statsVisible ? `${aPct}%` : '0%',
                                  transitionDelay: statsVisible ? `${idx * 50}ms` : '0ms',
                                }}
                              />
                            </div>
                            <span className={`mc-stat-val mc-stat-val--away ${awayLeads || tied ? 'mc-stat-val--lead' : 'mc-stat-val--trail'}`}>
                              {s.away}{s.pct ? '%' : ''}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ═══ POSTAVE ═══ */}
                {tab === 2 && (
                  <div className="mc-pnl" role="tabpanel" key="lineups">
                    <div className="mc-form-hdr">
                      <span className="mc-form-tag mc-form-tag--home"><span>{HOME.abbr}</span><span>4-3-3</span></span>
                      <span className="mc-form-tag mc-form-tag--away"><span>{AWAY.abbr}</span><span>4-2-3-1</span></span>
                    </div>

                    <div className="mc-pitch" ref={pitchRef}>
                      {/* Markings */}
                      <div className="mc-pitch-center" />
                      <div className="mc-pitch-circle" />
                      <div className="mc-pitch-dot" />
                      <div className="mc-pitch-box mc-pitch-box--pt mc-pitch-box--pt-t" />
                      <div className="mc-pitch-box mc-pitch-box--pt mc-pitch-box--pt-b" />
                      <div className="mc-pitch-box mc-pitch-box--gl mc-pitch-box--gl-t" />
                      <div className="mc-pitch-box mc-pitch-box--gl mc-pitch-box--gl-b" />
                      <div className="mc-pitch-corner mc-pitch-corner--tl" />
                      <div className="mc-pitch-corner mc-pitch-corner--tr" />
                      <div className="mc-pitch-corner mc-pitch-corner--bl" />
                      <div className="mc-pitch-corner mc-pitch-corner--br" />

                      {/* Home team (top half) */}
                      <div className="mc-pitch-half mc-pitch-half--home">
                        {HOME_XI.map((row, ri) => (
                          <div key={ri} className="mc-row">
                            {row.map((p) => {
                              const idx = playerIdx++
                              return (
                                <div key={p.num} className={`mc-player${pitchVisible ? ' mc-player-anim' : ''}`} style={{ animationDelay: `${idx * 50}ms` }}>
                                  <div className="mc-pdot mc-pdot--home">{p.num}</div>
                                  <span className="mc-pname">{p.name}</span>
                                  <span className="mc-rating" style={{ background: ratingBg(p.rating), boxShadow: ratingShadow(p.rating) }}>
                                    {p.rating.toFixed(1)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        ))}
                      </div>

                      {/* Away team (bottom half) */}
                      <div className="mc-pitch-half mc-pitch-half--away">
                        {AWAY_XI.map((row, ri) => (
                          <div key={ri} className="mc-row">
                            {row.map((p) => {
                              const idx = playerIdx++
                              return (
                                <div key={p.num} className={`mc-player${pitchVisible ? ' mc-player-anim' : ''}`} style={{ animationDelay: `${idx * 50}ms` }}>
                                  <div className="mc-pdot mc-pdot--away">{p.num}</div>
                                  <span className="mc-pname">{p.name}</span>
                                  <span className="mc-rating" style={{ background: ratingBg(p.rating), boxShadow: ratingShadow(p.rating) }}>
                                    {p.rating.toFixed(1)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Substitutes */}
                    <div className="mc-subs">
                      <div className="mc-subs-title">Klupa</div>
                      <div className="mc-subs-grid">
                        <div>
                          <div className="mc-subs-col-title">{HOME.name}</div>
                          {HOME_SUBS.map((p) => (
                            <div key={p.num} className="mc-sub">
                              <div className="mc-sub-dot" style={{ background: HOME.color }}>{p.num}</div>
                              <span className="mc-sub-name">{p.name}</span>
                              {p.subMin && <span className="mc-sub-in">↓ {p.subMin}&apos;</span>}
                              {p.rating > 0 && (
                                <span className="mc-sub-rating" style={{ background: ratingBg(p.rating), boxShadow: ratingShadow(p.rating) }}>
                                  {p.rating.toFixed(1)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="mc-subs-col-title">{AWAY.name}</div>
                          {AWAY_SUBS.map((p) => (
                            <div key={p.num} className="mc-sub">
                              <div className="mc-sub-dot" style={{ background: AWAY.color }}>{p.num}</div>
                              <span className="mc-sub-name">{p.name}</span>
                              {p.subMin && <span className="mc-sub-in">↓ {p.subMin}&apos;</span>}
                              {p.rating > 0 && (
                                <span className="mc-sub-rating" style={{ background: ratingBg(p.rating), boxShadow: ratingShadow(p.rating) }}>
                                  {p.rating.toFixed(1)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ TABELA ═══ */}
                {tab === 3 && (
                  <div className="mc-pnl" role="tabpanel" key="table">
                    <div className="mc-tbl-wrap">
                      <table className="mc-tbl">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Klub</th>
                            <th>U</th>
                            <th>P</th>
                            <th>N</th>
                            <th>I</th>
                            <th>GR</th>
                            <th className="mc-tbl-form">Forma</th>
                            <th>B</th>
                          </tr>
                        </thead>
                        <tbody>
                          {TABLE_DATA.map((r) => (
                            <tr key={r.pos} className={`${r.hl ? 'mc-tbl-hl' : ''}${r.zone ? ` mc-z-${r.zone}` : ''}`}>
                              <td>{r.pos}</td>
                              <td>{r.team}</td>
                              <td>{r.p}</td>
                              <td>{r.w}</td>
                              <td>{r.d}</td>
                              <td>{r.l}</td>
                              <td>{r.gd}</td>
                              <td className="mc-tbl-form">
                                <div className="mc-form">
                                  {r.form.map((f, fi) => (
                                    <span key={fi} className={`mc-fdot mc-fdot-${f.toLowerCase()}`} />
                                  ))}
                                </div>
                              </td>
                              <td className="mc-tbl-pts">{r.pts}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mc-zone-leg">
                      <span className="mc-zone-leg-item"><span className="mc-zone-leg-dot" style={{ background: 'var(--sba-blue)' }} /> Liga Prvaka</span>
                      <span className="mc-zone-leg-item"><span className="mc-zone-leg-dot" style={{ background: 'var(--sba-yellow)' }} /> Europa Liga</span>
                      <span className="mc-zone-leg-item"><span className="mc-zone-leg-dot" style={{ background: 'var(--sba-green)' }} /> Konferencijska</span>
                      <span className="mc-zone-leg-item"><span className="mc-zone-leg-dot" style={{ background: 'var(--sba-red)' }} /> Ispadanje</span>
                    </div>
                  </div>
                )}

                {/* ═══ H2H ═══ */}
                {tab === 4 && (
                  <div className="mc-pnl" role="tabpanel" key="h2h">
                    {/* Win percentage bar */}
                    <div className="mc-h2h-bar">
                      {h2h.wins > 0 && (
                        <div className="mc-h2h-seg mc-h2h-seg--w" style={{ width: `${(h2h.wins / h2hTotal) * 100}%` }}>
                          {h2h.wins}
                        </div>
                      )}
                      {h2h.draws > 0 && (
                        <div className="mc-h2h-seg mc-h2h-seg--d" style={{ width: `${(h2h.draws / h2hTotal) * 100}%` }}>
                          {h2h.draws}
                        </div>
                      )}
                      {h2h.losses > 0 && (
                        <div className="mc-h2h-seg mc-h2h-seg--l" style={{ width: `${(h2h.losses / h2hTotal) * 100}%` }}>
                          {h2h.losses}
                        </div>
                      )}
                    </div>
                    <div className="mc-h2h-txt">
                      <b>{HOME.name}: {h2h.wins} pobjedâ</b> &middot; Neriješeno: {h2h.draws} &middot; <b>{AWAY.name}: {h2h.losses} pobjeda</b>
                    </div>

                    <div className="mc-h2h-sec">Posljednjih {H2H_DATA.length} susreta</div>
                    {H2H_DATA.map((m, i) => {
                      const arsWon = m.result === 'W'
                      const cheWon = m.result === 'L'
                      const draw = m.result === 'D'
                      const homeIsArs = m.home === HOME.name
                      return (
                        <div key={i} className="mc-h2h-row">
                          <span className="mc-h2h-date">{m.date}</span>
                          <span className="mc-h2h-comp">{m.comp}</span>
                          <span className="mc-h2h-teams">
                            {homeIsArs ? <b>{m.home}</b> : m.home}
                            {' — '}
                            {!homeIsArs ? <b>{m.away}</b> : m.away}
                          </span>
                          <span className="mc-h2h-sc" style={{
                            color: draw ? 'var(--sba-text-3)' : arsWon ? 'var(--sba-accent)' : 'var(--sba-blue)',
                          }}>
                            {m.hs} &ndash; {m.as}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Mobile sidebar (shown below main on small screens) */}
              <div className="mc-side-mobile">
                <Sidebar />
              </div>
            </div>

            {/* ══════════ SIDEBAR (desktop) ══════════ */}
            <aside className="mc-side">
              <div className="mc-side-sticky">
                <Sidebar />
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   SIDEBAR COMPONENT (shared between desktop and mobile)
   ═══════════════════════════════════════════════════════════ */

function Sidebar() {
  return (
    <>
      {/* Info Card */}
      <div className="mc-card">
        <div className="mc-card-title">Info o utakmici</div>
        {SIDEBAR_INFO.map((r) => (
          <div key={r.label} className="mc-info-row">
            <span className="mc-info-icon">{r.icon}</span>
            <span className="mc-info-lbl">{r.label}</span>
            <span className="mc-info-val">{r.value}</span>
          </div>
        ))}
        <div className="mc-cap">
          <div className="mc-cap-bar">
            <div className="mc-cap-fill" style={{ width: '99.3%' }} />
          </div>
          <div className="mc-cap-lbl">99.3%</div>
        </div>
      </div>

      {/* Odds */}
      <div className="mc-card">
        <div className="mc-card-title">Kvote</div>
        <div className="mc-odds-grid">
          <div className="mc-odds-cell">
            <span className="mc-odds-lbl">1</span>
            <span className="mc-odds-val">{ODDS.home}</span>
          </div>
          <div className="mc-odds-cell">
            <span className="mc-odds-lbl">X</span>
            <span className="mc-odds-val">{ODDS.draw}</span>
          </div>
          <div className="mc-odds-cell">
            <span className="mc-odds-lbl">2</span>
            <span className="mc-odds-val">{ODDS.away}</span>
          </div>
        </div>
        <div className="mc-odds-foot">Powered by Lupon Media SSP</div>
      </div>

      {/* Ad */}
      <div className="mc-ad">Oglas</div>

      {/* Related News */}
      <div className="mc-card">
        <div className="mc-card-title">Povezano</div>
        {SIDEBAR_NEWS.map((n, i) => (
          <a key={i} href={n.href} className="mc-news-item">
            <div className="mc-news-thumb" style={{ background: n.grad }} />
            <div className="mc-news-body">
              <span className="mc-news-cat">{n.cat}</span>
              <span className="mc-news-title">{n.title}</span>
            </div>
          </a>
        ))}
      </div>
    </>
  )
}
