import { getDefaultSite } from '@/lib/db'

export default async function ImpressumPage() {
  const site = await getDefaultSite()
  const siteName = site?.name || 'Diurna'

  return (
    <div className="pub-container">
      <div className="pub-static">
        <h1>Impressum</h1>

        <h2>Publisher</h2>
        <p>
          {siteName}<br />
          Powered by Diurna CMS &amp; Lupon Media
        </p>

        <h2>Contact</h2>
        <p>
          For editorial inquiries, corrections, or general questions, please contact
          us through the main website.
        </p>

        <h2>Responsible for Content</h2>
        <p>
          The editorial team of {siteName} is responsible for all published content
          in accordance with applicable press law.
        </p>

        <h2>Disclaimer</h2>
        <p>
          Despite careful content control, we assume no liability for the content of
          external links. The operators of the linked pages are solely responsible for
          their content.
        </p>

        <h2>Copyright</h2>
        <p>
          All content published on this website, including text, images, and graphics,
          is protected by copyright. Any reproduction or use requires prior written
          consent from the publisher.
        </p>
      </div>
    </div>
  )
}
