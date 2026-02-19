import type { SubjectivityResult } from './subjectivity';
import type { OmissionResult } from './omission';
import { calculateSubjectivityScore } from './subjectivity';
import { checkOmissionBias } from './omission';
import type { MatchEvent } from '../types';

export interface FRCLResult {
  fri: number;
  status: 'SAFE' | 'WARNING' | 'BLOCK';
  subjectivity: SubjectivityResult;
  omission: OmissionResult;
}

export function runFRCL(contentHtml: string, events: MatchEvent[]): FRCLResult {
  const subjectivity = calculateSubjectivityScore(contentHtml);
  const omission = checkOmissionBias(contentHtml, events);

  // FRI = (subjectivity × 0.5) + (omission_risk × 0.5)
  const fri = (subjectivity.score * 0.5) + (omission.omission_risk * 0.5);

  return {
    fri: Math.round(fri * 10000) / 10000,
    status: fri < 0.15 ? 'SAFE' : fri < 0.25 ? 'WARNING' : 'BLOCK',
    subjectivity,
    omission,
  };
}

export type { SubjectivityResult } from './subjectivity';
export type { OmissionResult } from './omission';
