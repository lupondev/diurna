export type EvidenceMode = 'FACT_MODE' | 'SOURCE_MODE' | 'GENERAL_MODE'

export type GeoReadiness = 'HIGH' | 'MEDIUM' | 'LOW'

export interface Finding {
  code: string
  gate: string
  location: string
  text: string
  fix: string
}

export interface GateFinding {
  pass: boolean
  severity: 'error' | 'warn'
  findings?: Finding[]
  exit_points?: number[]
  so_what_present?: boolean
  hallucination_risks?: Finding[]
  escalated_to_error?: boolean
  seo_findings?: Finding[]
  geo_findings?: Finding[]
  structured_data_valid?: boolean
  faq_present?: boolean
  entity_consistency?: boolean
  headline_length?: number
  meta_desc_length?: number
  internal_link_count?: number
  h2_count?: number
}

export interface ValidationResult {
  pass: boolean
  score: number
  seo_score: number
  geo_readiness: GeoReadiness
  mode: EvidenceMode
  format: string
  publish_blocked: boolean
  gates: {
    G1: GateFinding
    G2: GateFinding
    G3: GateFinding
    G4: GateFinding
    G5: GateFinding
    G6: GateFinding
    G7: GateFinding
    G8: GateFinding
  }
  errors: Finding[]
  warnings: Finding[]
  editor_notes: string
  rule_gap_filled?: string[]
}

export interface VoiceProfile {
  publisher_id: string
  sentence_length: { min_avg: number; max_avg: number }
  emotional_register: 'NEUTRAL' | 'ENGAGED' | 'PASSIONATE'
  first_person: { news: boolean; analysis: boolean; column: boolean }
  vocabulary_register: 'FORMAL' | 'STANDARD' | 'COLLOQUIAL'
  active_verb_minimum: number
  format_overrides?: Record<string, Partial<VoiceProfile>>
}

export interface GlobalSpec {
  mode: EvidenceMode
  format: string
  voiceProfile: VoiceProfile
  language?: string
  wordCount?: number
}

export interface ValidatorOptions {
  skipGates?: string[]
}

export interface TaskInput {
  topic: string
  facts_payload?: string | Array<Record<string, unknown>>
  sources?: Array<{ title: string; source: string; role: string }>
  sourceContext?: string
  mode?: 'single' | 'combined' | 'rewrite' | 'copilot'
  citations?: string[]
}
