import type { Metadata } from 'next'
import { StaticNav } from '@/components/public/sportba/static-nav'
import '../static.css'

export const metadata: Metadata = {
  title: 'Politika privatnosti \u2014 Sport.ba',
  description: 'Kako Sport.ba prikuplja, koristi i \u0161titi va\u0161e podatke.',
}

export default function PrivacyPage() {
  return (
    <main className="sba-sp">
      <StaticNav current="/privatnost" />
      <div className="sba-sp-content">
        <h1 className="sba-sp-title">Politika privatnosti</h1>
        <div className="sba-sp-prose">
          <p>
            Va\u0161a privatnost nam je va\u017ena. Ova politika obja\u0161njava kako Sport.ba (u vlasni\u0161tvu Lupon Media d.o.o.)
            prikuplja, koristi i \u0161titi va\u0161e li\u010dne podatke u skladu sa GDPR regulativom i zakonima
            Bosne i Hercegovine.
          </p>

          <h2>Prikupljanje podataka</h2>
          <p>
            Prikupljamo sljede\u0107e podatke: IP adresu, tip pretra\u017eiva\u010da, operativni sistem, stranice koje
            posje\u0107ujete, vrijeme posje\u0107ivanja. Ako se registrujete na newsletter, prikupljamo va\u0161u
            email adresu. Ako nas kontaktirate putem obrasca, prikupljamo ime, email i sadr\u017eaj poruke.
          </p>

          <h2>Kola\u010di\u0107i (Cookies)</h2>
          <p>
            Koristimo tri vrste kola\u010di\u0107a:
          </p>
          <h3>Neophodni kola\u010di\u0107i</h3>
          <p>
            Potrebni za rad stranice \u2014 uklju\u010duju sesiju, preferencije teme (tamna/svijetla)
            i jezi\u010dke postavke. Ne mo\u017eete ih onemugu\u0107iti.
          </p>
          <h3>Analiti\u010dki kola\u010di\u0107i</h3>
          <p>
            Koristimo ih za razumijevanje kako korisnici koriste stranicu. Podaci su anonimizirani
            i slu\u017ee za pobolj\u0161anje korisni\u010dkog iskustva. Alati: Vercel Analytics.
          </p>
          <h3>Ogla\u0161iva\u010dki kola\u010di\u0107i</h3>
          <p>
            Koriste ih na\u0161i ogla\u0161iva\u010dki partneri (Lupon SSP) za prikazivanje relevantnih oglasa.
            Mo\u017eete ih odbiti putem postavki pretra\u017eiva\u010da.
          </p>

          <h2>Va\u0161a prava (GDPR)</h2>
          <p>
            Imate pravo na:
          </p>
          <ul>
            <li><strong>Pristup</strong> \u2014 zatra\u017eiti kopiju va\u0161ih podataka</li>
            <li><strong>Ispravku</strong> \u2014 ispraviti neta\u010dne podatke</li>
            <li><strong>Brisanje</strong> \u2014 zatra\u017eiti brisanje va\u0161ih podataka</li>
            <li><strong>Ograni\u010davanje obrade</strong> \u2014 ograni\u010diti na\u010din kori\u0161tenja podataka</li>
            <li><strong>Prenosivost</strong> \u2014 dobiti podatke u strojno \u010ditljivom formatu</li>
            <li><strong>Prigovor</strong> \u2014 ulo\u017eiti prigovor na obradu podataka</li>
          </ul>
          <p>
            Za ostvarivanje ovih prava, kontaktirajte nas na{' '}
            <a href="mailto:privacy@sport.ba">privacy@sport.ba</a>.
          </p>

          <h2>Tre\u0107e strane</h2>
          <p>
            Va\u0161e podatke ne prodajemo. Dijelimo ih samo sa: Vercel (hosting), Neon (baza podataka),
            Lupon SSP (oglasi). Svi partneri su u skladu sa GDPR regulativom.
          </p>

          <h2>Sigurnost</h2>
          <p>
            Koristimo HTTPS enkripciju, pristup podacima je ograni\u010den na ovla\u0161teno osoblje,
            a baze podataka su za\u0161ti\u0107ene enkripcijom u mirovanju i prenosu.
            Redovno provodimo sigurnosne provjere.
          </p>

          <p>
            Posljednje a\u017euriranje: 15. februar 2026.
          </p>
        </div>
      </div>
    </main>
  )
}
