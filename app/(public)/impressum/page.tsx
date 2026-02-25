import type { Metadata } from 'next'
import { StaticNav } from '@/components/public/sportba/static-nav'
import { canonicalUrl } from '@/lib/seo'
import '../static.css'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Impressum \u2014 Diurna',
  description: 'Pravne informacije o izdava\u010du Diurna.',
  alternates: { canonical: canonicalUrl('/impressum') },
}

const INFO = [
  { label: 'Izdava\u010d', value: 'Lupon Media d.o.o.' },
  { label: 'Direktor', value: 'Harun Omerovi\u0107' },
  { label: 'Sjedi\u0161te', value: 'Sarajevo, Bosna i Hercegovina' },
  { label: 'Email', value: 'redakcija@todayfootballmatch.com' },
  { label: 'Web', value: 'todayfootballmatch.com' },
  { label: 'Glavni urednik', value: 'Emir Had\u017ei\u0107' },
]

export default function ImpressumPage() {
  return (
    <main className="sba-sp">
      <StaticNav current="/impressum" />
      <div className="sba-sp-content">
        <h1 className="sba-sp-title">Impressum</h1>

        <div className="sba-sp-info-grid">
          {INFO.map((item) => (
            <div key={item.label} className="sba-sp-info-card">
              <span className="sba-sp-info-label">{item.label}</span>
              <span className="sba-sp-info-value">{item.value}</span>
            </div>
          ))}
        </div>

        <div className="sba-sp-prose">
          <h2>Autorska prava</h2>
          <p>
            Sav sadr\u017eaj objavljen na Diurna \u2014 uklju\u010duju\u0107i tekstove, fotografije, grafike i video materijale \u2014
            za\u0161ti\u0107en je autorskim pravima i vlasni\u0161tvo je Lupon Media d.o.o., osim ako nije druga\u010dije navedeno.
            Preno\u0161enje sadr\u017eaja dozvoljeno je uz obavezan navod izvora i link na originalni \u010dlanak.
          </p>

          <h2>Fotografije</h2>
          <p>
            Fotografije kori\u0161tene na Diurna dolaze iz sljede\u0107ih izvora: Getty Images, AFP, Reuters,
            te iz sopstvene arhive. Fotografi i agencije navedeni su uz svaku fotografiju.
            Ako smatrate da je va\u0161e autorsko pravo povrije\u0111eno, kontaktirajte nas na{' '}
            <a href="mailto:redakcija@todayfootballmatch.com">redakcija@todayfootballmatch.com</a>.
          </p>

          <h2>Odricanje od odgovornosti</h2>
          <p>
            Informacije na ovom portalu pru\u017eaju se u informativne svrhe. Diurna ne preuzima
            odgovornost za ta\u010dnost informacija preuzetih iz eksternih izvora. Za ogla\u0161iva\u010dki sadr\u017eaj
            odgovoran je ogla\u0161iva\u010d.
          </p>
        </div>
      </div>
    </main>
  )
}
