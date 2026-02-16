import { getDefaultSite } from '@/lib/db'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const site = await getDefaultSite()
  const siteName = site?.name || 'Diurna'
  return {
    title: `Privacy Policy - ${siteName}`,
    description: `Privacy policy for ${siteName}. Learn how we handle your data.`,
  }
}

export default async function PrivacyPage() {
  const site = await getDefaultSite()
  const siteName = site?.name || 'Diurna'

  return (
    <div className="pub-container">
      <div className="pub-static">
        <h1>Privacy Policy</h1>
        <p>
          This privacy policy describes how {siteName} collects, uses, and protects your
          personal information when you visit our website.
        </p>

        <h2>Information We Collect</h2>
        <p>
          We may collect the following types of information:
        </p>
        <ul>
          <li>Email address (when you subscribe to our newsletter)</li>
          <li>Usage data (pages visited, time spent, browser type)</li>
          <li>Cookies and similar tracking technologies</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>
          Your information is used to:
        </p>
        <ul>
          <li>Deliver newsletter content you have subscribed to</li>
          <li>Improve our website and user experience</li>
          <li>Analyze site traffic and usage patterns</li>
        </ul>

        <h2>Data Protection</h2>
        <p>
          We take appropriate security measures to protect your personal data against
          unauthorized access, alteration, disclosure, or destruction.
        </p>

        <h2>Third-Party Services</h2>
        <p>
          We may use third-party services such as analytics providers and advertising
          networks. These services may collect information about your visits as described
          in their own privacy policies.
        </p>

        <h2>Your Rights</h2>
        <p>
          You have the right to access, correct, or delete your personal data. To exercise
          these rights, please contact us through our main website.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. Any changes will be posted
          on this page with an updated revision date.
        </p>
      </div>
    </div>
  )
}
