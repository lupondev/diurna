import type { ValidationResult, GlobalSpec, Finding, GateFinding, ValidatorOptions } from './types'

const emptyFinding = (gate: string, severity: 'error' | 'warn'): GateFinding => ({
  pass: true,
  severity,
  findings: [],
})

function createPassResult(spec: GlobalSpec): ValidationResult {
  return {
    pass: true,
    score: 100,
    seo_score: 100,
    geo_readiness: 'HIGH',
    mode: spec.mode,
    format: spec.format,
    publish_blocked: false,
    gates: {
      G1: emptyFinding('G1', 'error'),
      G2: emptyFinding('G2', 'error'),
      G3: { ...emptyFinding('G3', 'error'), hallucination_risks: [] },
      G4: { ...emptyFinding('G4', 'warn'), escalated_to_error: false },
      G5: { ...emptyFinding('G5', 'warn'), exit_points: [], so_what_present: true },
      G6: emptyFinding('G6', 'error'),
      G7: emptyFinding('G7', 'warn'),
      G8: {
        pass: true,
        severity: 'warn',
        seo_findings: [],
        geo_findings: [],
        structured_data_valid: true,
        faq_present: true,
        entity_consistency: true,
      },
    },
    errors: [],
    warnings: [],
    editor_notes: '',
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function wordCount(html: string): number {
  return stripHtml(html).split(/\s+/).filter(Boolean).length
}

export function validate(
  text: string,
  spec: GlobalSpec,
  options?: ValidatorOptions
): ValidationResult {
  const skip = new Set(options?.skipGates ?? [])
  const result = createPassResult(spec)
  const plain = stripHtml(text)
  const words = plain.split(/\s+/).filter(Boolean)
  const wc = words.length

  if (!skip.has('G1')) {
    const hasH2 = /<h2[\s>]/i.test(text)
    const hasP = /<p[\s>]/i.test(text)
    const paragraphCount = (text.match(/<p[\s>]/gi) || []).length
    result.gates.G1.pass = hasP && paragraphCount >= 2
    if (!result.gates.G1.pass) {
      result.gates.G1.findings = [
        { code: 'E201', gate: 'G1', location: 'body', text: 'Missing structure', fix: 'Add headline, lead, body (min 2 paragraphs), conclusion.' },
      ]
      result.errors.push(result.gates.G1.findings[0])
      result.pass = false
      result.publish_blocked = true
    }
  }

  if (!skip.has('G2')) {
    result.gates.G2.pass = true
  }

  if (!skip.has('G8')) {
    const headlineMatch = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || text.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
    const headline = headlineMatch ? stripHtml(headlineMatch[1]) : ''
    result.gates.G8.headline_length = headline.length
    result.gates.G8.meta_desc_length = 0
    result.gates.G8.internal_link_count = (text.match(/<a\s+href=/gi) || []).length
    result.gates.G8.h2_count = (text.match(/<h2[\s>]/gi) || []).length
    if (headline.length > 0 && (headline.length < 50 || headline.length > 70)) {
      const f: Finding = { code: 'W801', gate: 'G8', location: 'headline', text: headline.slice(0, 80), fix: 'Keep headline between 50–70 characters.' }
      result.gates.G8.seo_findings = result.gates.G8.seo_findings || []
      result.gates.G8.seo_findings.push(f)
      result.warnings.push(f)
    }
    if (wc > 800) {
      const hasFaq = /<h3[\s>]/i.test(text) && (text.match(/<h3[\s>]/gi) || []).length >= 3
      if (!hasFaq) {
        const f: Finding = { code: 'W814', gate: 'G8', location: 'body', text: '', fix: 'Add FAQ section with 3+ questions for articles over 800 words.' }
        result.gates.G8.faq_present = false
        result.gates.G8.geo_findings = result.gates.G8.geo_findings || []
        result.gates.G8.geo_findings.push(f)
        result.warnings.push(f)
      }
    }
  }

  result.score = result.pass ? 100 : Math.max(0, 100 - result.errors.length * 15)
  result.seo_score = result.gates.G8.seo_findings?.length ? Math.max(0, 100 - result.gates.G8.seo_findings.length * 10) : 100
  result.geo_readiness = result.seo_score >= 80 ? 'HIGH' : result.seo_score >= 50 ? 'MEDIUM' : 'LOW'
  return result
}
