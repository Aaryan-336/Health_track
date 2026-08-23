import { aiConfigured, env } from '@/lib/env';

/**
 * Optional low-latency LLM used only to rephrase already-computed findings.
 * When no key is configured the app falls back to deterministic copy — the
 * feature degrades in tone, never in correctness.
 */

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export async function rephrase(system: string, user: string): Promise<string | null> {
  if (!aiConfigured()) return null;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env().AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env().AI_MODEL,
        temperature: 0.4,
        max_tokens: 160,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export const SYSTEM_PROMPT = `You write one short, warm sentence for a couples wellbeing app.

Absolute rules:
- You are NOT a doctor. Never diagnose, never suggest causes, never mention conditions, symptoms, medication or treatment.
- Only restate the finding you are given. Never invent a number — reuse exactly the numbers provided.
- Never imply the person did badly. Missing data is never failure.
- Warm, plain, gently playful. No emoji. Maximum 22 words. Output the sentence only.`;
