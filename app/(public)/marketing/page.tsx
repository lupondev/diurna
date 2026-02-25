import type { Metadata } from 'next'
import { StaticNav } from '@/components/public/sportba/static-nav'
import { canonicalUrl } from '@/lib/seo'
import '../static.css'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Marketing i ogla\u0161avanje \u2014 Diurna',
  description: 'Ogla\u0161avajte se na Diurna \u2014 Lupon SSP, programmatic, premium formati.',
  alternates: { canonical: canonicalUrl('/marketing') },
}

const AD_FORMATS = [
  { name: 'Leaderboard', size: '728\u00d790 / 320\u00d750', desc: 'Premium pozicija na vrhu stranice. Najve\u0107a vidljivost.' },
  { name: 'Rectangle', size: '300\u00d7250', desc: 'Unutar \u010dlanka ili u sidebar-u. Idealan za branding.' },
  { name: 'Skyscraper', size: '300\u00d7600', desc: 'Sticky sidebar format sa dugim vremenom izlo\u017eenosti.' },
  { name: 'Native Ad', size: 'Responsive', desc: 'Sponzorirani sadr\u017eaj integrisan u feed vijesti.' },
  { name: 'Interscroller', size: 'Fullscreen', desc: 'Mobilni format koji se prikazuje pri scrollanju.' },
  { name: 'Skin / Takeover', size: 'Fullscreen', desc: 'Potpuno brendiranje stranice za kampanje velikog obima.' },
]

const AUDIENCE = [
  { num: '250K+', label: 'Mjese\u010dnih posjetilaca' },
  { num: '1.2M', label: 'Pogleda stranica' },
  { num: '72%', label: 'Mobilni korisnici' },
  { num: '18\u201334', label: 'Glavna demografija' },
]

export default function MarketingPage() {
  return (
    <main className="sba-sp">
      <StaticNav current="/marketing" />
      <div className="sba-sp-content">
        <h1 className="sba-sp-title">Marketing i ogla\u0161avanje</h1>

        <div className="sba-sp-highlight">
          <div className="sba-sp-highlight-title">Powered by Lupon SSP</div>
          <div className="sba-sp-highlight-text">
            Diurna koristi Lupon SSP \u2014 na\u0161u in-house Supply-Side Platform za isporuku oglasa.
            Lupon SSP podr\u017eava header bidding, server-side aukcije i direktne kampanje,
            osiguravaju\u0107i optimalne CPM-ove i korisni\u010dko iskustvo u skladu sa Better Ads standardima.
          </div>
        </div>

        <div className="sba-sp-prose">
          <h2>Na\u0161a publika</h2>
          <p>
            Diurna privla\u010di sportske entuzijaste iz Bosne i Hercegovine i regije.
            Na\u0161a publika je anga\u017eovana, lojalna i digitalno pismena.
          </p>
        </div>

        <div className="sba-sp-audience">
          {AUDIENCE.map((a) => (
            <div key={a.label} className="sba-sp-audience-stat">
              <span className="sba-sp-audience-num">{a.num}</span>
              <span className="sba-sp-audience-label">{a.label}</span>
            </div>
          ))}
        </div>

        <div className="sba-sp-prose">
          <h2>Formati oglasa</h2>
          <p>
            Nudimo razli\u010dite formate prilago\u0111ene va\u0161im kampanjskim ciljevima:
          </p>
        </div>

        <div className="sba-sp-ad-grid">
          {AD_FORMATS.map((f) => (
            <div key={f.name} className="sba-sp-ad-card">
              <div className="sba-sp-ad-card-name">{f.name}</div>
              <span className="sba-sp-ad-card-size">{f.size}</span>
              <div className="sba-sp-ad-card-desc">{f.desc}</div>
            </div>
          ))}
        </div>

        <div className="sba-sp-prose">
          <h2>Programmatic ogla\u0161avanje</h2>
          <p>
            Podr\u017eavamo programmatic kupovinu putem svih glavnih DSP platformi. Lupon SSP
            je integrisan sa <strong>Google Ad Manager</strong>, <strong>Prebid.js</strong> i
            vi\u0161e od 20 SSP partnera. Pru\u017eamo transparentne izvje\u0161taje, brand safety kontrole
            i fraud detekciju.
          </p>

          <h2>Better Ads standardi</h2>
          <p>
            Diurna je u potpunosti uskla\u0111en sa <strong>Coalition for Better Ads</strong> standardima.
            Ne koristimo pop-up oglase, auto-play video sa zvukom, prestitial ads sa odbrojavanjem
            ili sticky ads koji zauzimaju vi\u0161e od 30% ekrana. Na\u0161 cilj je ogla\u0161avanje koje
            po\u0161tuje korisni\u010dko iskustvo.
          </p>

          <h2>Kontakt za ogla\u0161iva\u010de</h2>
          <p>
            Za media kit, cjenovnik i custom kampanje, kontaktirajte na\u0161 marketing tim
            na <a href="mailto:marketing@todayfootballmatch.com">marketing@todayfootballmatch.com</a>.
          </p>
        </div>
      </div>
    </main>
  )
}
