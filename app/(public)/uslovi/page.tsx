import type { Metadata } from 'next'
import { StaticNav } from '@/components/public/sportba/static-nav'
import { canonicalUrl } from '@/lib/seo'
import '../static.css'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Uslovi kori\u0161tenja \u2014 Diurna',
  description: 'Uslovi kori\u0161tenja portala Diurna.',
  alternates: { canonical: canonicalUrl('/uslovi') },
}

export default function TermsPage() {
  return (
    <main className="sba-sp">
      <StaticNav current="/uslovi" />
      <div className="sba-sp-content">
        <h1 className="sba-sp-title">Uslovi kori\u0161tenja</h1>
        <div className="sba-sp-prose">
          <p>
            Kori\u0161tenjem portala Diurna prihvatate sljede\u0107e uslove. Molimo vas da ih pa\u017eljivo
            pro\u010ditate prije nastavka kori\u0161tenja.
          </p>

          <h2>Kori\u0161tenje sadr\u017eaja</h2>
          <p>
            Sav sadr\u017eaj na Diurna namijenjen je isklju\u010divo za li\u010dnu, nekomercijalnu upotrebu.
            Zabranjeno je kopiranje, distribucija ili reprodukcija sadr\u017eaja bez pisanog odobrenja
            izdava\u010da. Dijeljenje linkova na \u010dlanke je dozvoljeno i po\u017eeljno.
          </p>
          <p>
            Preno\u0161enje dijelova \u010dlanaka dozvoljeno je uz obavezan navod izvora u formatu:
            &ldquo;Izvor: Diurna&rdquo; sa aktivnim linkom na originalni \u010dlanak.
          </p>

          <h2>Komentari</h2>
          <p>
            Korisnici mogu komentarisati \u010dlanke pod sljede\u0107im uslovima:
          </p>
          <ul>
            <li>Komentari ne smiju sadr\u017eavati govor mr\u017enje, uvrede ili diskriminaciju</li>
            <li>Zabranjeni su spam, reklame i neprimjereni sadr\u017eaj</li>
            <li>Redakcija zadr\u017eava pravo brisanja komentara bez prethodnog obavje\u0161tenja</li>
            <li>Odgovornost za sadr\u017eaj komentara snosi autor komentara</li>
          </ul>

          <h2>AI generirani sadr\u017eaj</h2>
          <p>
            Diurna koristi AI alate kao pomo\u0107 u pisanju i ure\u0111ivanju \u010dlanaka. Svaki \u010dlanak
            koji koristi AI asistenciju prolazi kroz uredni\u010dku kontrolu i verifikaciju
            \u010dinjeni\u010dnih navoda. AI generirani sadr\u017eaj je jasno ozna\u010den u skladu
            sa na\u0161im uredni\u010dkim standardima.
          </p>

          <h2>Ogla\u0161avanje</h2>
          <p>
            Diurna prikazuje oglase putem Lupon SSP platforme. Ogla\u0161iva\u010dki sadr\u017eaj je jasno
            ozna\u010den oznakom &ldquo;Sponzorisano&rdquo; ili &ldquo;Oglas&rdquo;. Redakcijski sadr\u017eaj je
            potpuno nezavisan od ogla\u0161iva\u010da.
          </p>

          <h2>Ograni\u010denje odgovornosti</h2>
          <p>
            Diurna ne garantuje apsolutnu ta\u010dnost svih objavljenih informacija. Rezultati,
            statistike i transferne vijesti mogu se promijeniti. Ne preuzimamo odgovornost
            za odluke donesene na osnovu informacija objavljenih na portalu,
            uklju\u010duju\u0107i kladioni\u010dke odluke.
          </p>
          <p>
            Diurna zadr\u017eava pravo izmjene ovih uslova u bilo kojem trenutku.
            A\u017eurirani uslovi stupaju na snagu odmah po objavljivanju.
          </p>

          <p>
            Posljednje a\u017euriranje: 15. februar 2026.
          </p>
        </div>
      </div>
    </main>
  )
}
