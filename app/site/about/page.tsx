import { getDefaultSite } from '@/lib/db'

export default async function AboutPage() {
  const site = await getDefaultSite()
  const siteName = site?.name || 'Diurna'

  return (
    <div className="pub-container">
      <div className="pub-static">
        <h1>About {siteName}</h1>
        <p>
          {siteName} is a digital publication committed to delivering accurate, timely, and
          in-depth news coverage. Our team of journalists and editors work around the clock to
          bring you the stories that matter most.
        </p>

        <h2>Our Mission</h2>
        <p>
          We believe in the power of quality journalism to inform, inspire, and hold
          institutions accountable. Our mission is to provide fair, balanced, and comprehensive
          reporting on the topics our readers care about.
        </p>

        <h2>Our Team</h2>
        <p>
          Our newsroom is made up of experienced journalists, editors, and digital media
          professionals who are passionate about storytelling and committed to journalistic
          integrity.
        </p>

        <h2>Contact</h2>
        <p>
          Have a story tip, correction, or general inquiry? We&apos;d love to hear from you.
          Reach out to our editorial team via the contact information on our main website.
        </p>
      </div>
    </div>
  )
}
