import { GoogleGenAI, Type } from '@google/genai';

// Initializes with your GEMINI_API_KEY environment variable by default
const ai = new GoogleGenAI({});

const SYSTEM_PROMPT = `You are CodePulse, an elite automated code reviewer. You receive a unified diff from a GitHub pull request and must identify real, actionable security and performance issues.
RULES:
- Only report genuine problems. Do not flag stylistic preferences.
- Severity MUST be one of: CRITICAL, WARNING, INFO
- Category MUST be one of: Security, Performance, Code Smell`;

// Define the precise JSON Schema for Gemini's structured output engine
const responseSchema = {
  type: Type.ARRAY,
  description: "List of code review findings",
  items: {
    type: Type.OBJECT,
    properties: {
      file: { type: Type.STRING, description: "The relative path to the file" },
      line: { type: Type.INTEGER, description: "The new file line number where the issue exists" },
      severity: { type: Type.STRING, enum: ["CRITICAL", "WARNING", "INFO"] },
      category: { type: Type.STRING, enum: ["Security", "Performance", "Code Smell"] },
      comment: { type: Type.STRING, description: "Concise explanation of the issue" },
      fixedCode: { type: Type.STRING, description: "Corrected single-line replacement snippet" },
    },
    required: ["file", "line", "severity", "category", "comment", "fixedCode"],
  },
};

export async function analyzeDiff(diff) {
  console.log(`[Analyzer] Sending ${diff.length} chars of diff to Gemini…`);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Lightning fast, perfect for live webhook loops
      contents: `Review the following GitHub pull request diff and map out code anomalies:\n\n${diff}`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        // Enforce structural validation boundaries natively
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2,
      }
    });

    // Gemini returns clean, guaranteed structural JSON text directly matching your array schema
    const findings = JSON.parse(response.text);
    console.log(`[Analyzer] Gemini returned ${findings.length} finding(s)`);
    return Array.isArray(findings) ? findings : [];

  } catch (err) {
    console.error('[Analyzer] Failed during Gemini pipeline extraction:', err);
    return [];
  }
}

export function computeScore(findings) {
  if (!findings || findings.length === 0) return 100;
  
  // Hard penalties to ensure the gauge drops significantly on threats
  const penalties = { CRITICAL: 25, WARNING: 10, INFO: 2 };
  let score = 100;

  for (const f of findings) {
    score -= penalties[f.severity] || 0;
  }

  // Clamp it between 0 and 100
  return Math.max(0, Math.min(100, score));
}