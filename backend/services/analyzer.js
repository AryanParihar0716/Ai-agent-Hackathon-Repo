// ────────────────────────────────────────────────────────────
//  Analyzer Service — sends PR diffs to Claude and extracts
//  structured JSON findings with severity, category, and fix.
// ────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are CodePulse, an elite automated code reviewer. You receive a unified diff from a GitHub pull request and must identify real, actionable issues.

RULES:
- Only report genuine problems. Do not flag stylistic preferences.
- Each finding must include: file path, line number (from the new file), severity, category, a concise explanation, and a one-line code fix.
- Severity MUST be one of: CRITICAL, WARNING, INFO
- Category MUST be one of: Security, Performance, Code Smell
- The "fixedCode" should be the corrected replacement for that single line.

Respond with ONLY a JSON array — no markdown fences, no commentary.

Schema per finding:
{
  "file": "<path>",
  "line": <number>,
  "severity": "CRITICAL" | "WARNING" | "INFO",
  "category": "Security" | "Performance" | "Code Smell",
  "comment": "<concise explanation of the issue>",
  "fixedCode": "<corrected single-line replacement>"
}

If no issues are found, return an empty array: []`;

/**
 * Analyze a unified diff and return structured findings.
 *
 * @param {string} diff — raw unified diff text
 * @returns {Promise<Array>} — parsed array of finding objects
 */
export async function analyzeDiff(diff) {
  console.log(`[Analyzer] Sending ${diff.length} chars of diff to Claude…`);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Review the following GitHub pull request diff and return a JSON array of findings:\n\n${diff}`,
      },
    ],
    system: SYSTEM_PROMPT,
  });

  // Extract the text block from Claude's response
  const raw = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  try {
    const findings = JSON.parse(raw);
    console.log(`[Analyzer] Claude returned ${findings.length} finding(s)`);
    return Array.isArray(findings) ? findings : [];
  } catch (err) {
    console.error('[Analyzer] Failed to parse Claude response:', raw.slice(0, 300));
    return [];
  }
}

/**
 * Compute a health score from findings.
 * Starts at 100, deducts per severity level.
 *
 * @param {Array} findings
 * @returns {number} score clamped to [0, 100]
 */
export function computeScore(findings) {
  const penalties = { CRITICAL: 15, WARNING: 5, INFO: 1 };
  let score = 100;

  for (const f of findings) {
    score -= penalties[f.severity] || 0;
  }

  return Math.max(0, Math.min(100, score));
}
