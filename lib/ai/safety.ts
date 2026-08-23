/**
 * Safety validator for generated insight copy.
 *
 * The product is explicitly not a medical tool. Numbers are always computed
 * deterministically; the model only ever rephrases them. Anything that reads
 * as diagnosis, causation or treatment is rejected and we fall back to the
 * deterministic sentence.
 */

const BANNED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(diagnos\w*)\b/i, reason: 'diagnostic language' },
  { pattern: /\b(symptom|syndrome|disorder|disease|condition)\b/i, reason: 'clinical framing' },
  { pattern: /\b(prescrib\w*|dosage|medication|medicine|supplement|drug)\b/i, reason: 'treatment advice' },
  { pattern: /\b(you should (see|consult|visit) a (doctor|physician))\b/i, reason: 'clinical referral' },
  { pattern: /\b(deficien\w*|deficiency|anemi\w*|depress(ion|ed)|anxiety disorder)\b/i, reason: 'clinical claim' },
  { pattern: /\b(is caused by|causes your|due to your|because your body)\b/i, reason: 'causal claim' },
  { pattern: /\b(cure|treat|heal|remedy)\b/i, reason: 'treatment claim' },
  { pattern: /\b(unhealthy|dangerous|at risk|warning sign)\b/i, reason: 'alarming framing' },
];

export type SafetyVerdict = { safe: true } | { safe: false; reason: string };

export function validateInsightCopy(text: string): SafetyVerdict {
  for (const { pattern, reason } of BANNED_PATTERNS) {
    if (pattern.test(text)) return { safe: false, reason };
  }
  if (text.length > 400) return { safe: false, reason: 'too long' };
  return { safe: true };
}

/**
 * Every number in the copy must appear in the deterministic evidence, so the
 * model cannot invent a figure.
 */
export function numbersAreGrounded(text: string, allowed: number[]): boolean {
  const found = text.match(/\d+(\.\d+)?/g) ?? [];
  const allowedSet = new Set(allowed.map((n) => String(n)));
  return found.every((n) => allowedSet.has(n) || allowedSet.has(String(Number(n))));
}
