export const ERROR_CODES = [
  'E101', 'E102', 'E201', 'E202', 'E203', 'E301', 'E302', 'E303', 'E304',
  'E402', 'E501', 'E502', 'E601', 'E602',
] as const

export const WARN_CODES = [
  'W201', 'W202', 'W401', 'W601', 'W602', 'W701', 'W702',
  'W801', 'W802', 'W803', 'W804', 'W805', 'W806', 'W807',
  'W811', 'W812', 'W813', 'W814', 'W815', 'W816', 'W817', 'W901',
] as const

export const HARD_BLACKLIST_BS_HR_SR: string[] = [
  'jedan od najintenzivnijih', 'jedan od najvećih', 'jedan od najvažnijih',
  'poznato je da', 'opštepoznato je', 'istraživanja pokazuju', 'studije su pokazale',
  'mnogi stručnjaci smatraju', 'stručnjaci kažu', 'nezaboravni momenat', 'nezaboravni trenutak', 'nezaboravni susret',
  'sve veći broj', 'sve više', 'smatra se', 'smatraju',
  'ogromna pažnja', 'nevjerovatna pažnja', 'enormna pažnja',
  'psihološki aspekt', 'od samog početka', 'oduvijek', 'kroz historiju',
]

export const HARD_BLACKLIST_EN: string[] = [
  'it goes without saying', 'experts say', 'experts agree', 'studies show', 'research suggests',
  'in recent times', 'in recent years', 'one of the most important', 'one of the most significant',
  'it is widely believed', 'widely known', 'needless to say', 'at the end of the day',
  'the fact of the matter is',
]

export const SOFT_BLACKLIST: string[] = [
  'važno je napomenuti', 'it is important to note', 'ostaje da se vidi', 'remains to be seen',
  'bez sumnje', 'without a doubt', 's jedne strane', 's druge strane', 'on one hand', 'on the other hand',
  'u konačnici', 'ultimately',
]

import type { VoiceProfile } from './types'

export const DIURNA_DEFAULT_VOICE: VoiceProfile = {
  publisher_id: 'diurna',
  sentence_length: { min_avg: 10, max_avg: 20 },
  emotional_register: 'ENGAGED',
  first_person: { news: false, analysis: false, column: true },
  vocabulary_register: 'STANDARD',
  active_verb_minimum: 0.70,
}
