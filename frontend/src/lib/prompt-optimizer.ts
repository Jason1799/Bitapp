// Prompt Optimizer - Analyzes diff between AI output and user-corrected output
import { analyzeWithAI, AIConfig, BUILTIN_FALLBACK_MODELS } from './ai';
import { ListingAgreementData } from './types';

export interface DiffEntry {
    field: string;
    aiValue: string;
    userValue: string;
}

export interface OptimizationLogEntry {
    id: string;
    timestamp: number;
    diffs: DiffEntry[];
    aiSuggestion: string;
    emailSnippet: string; // first 200 chars of email for context
}

const DIFF_ANALYSIS_PROMPT = `You are an AI prompt optimization assistant. I will give you:
1. The original email text
2. A list of fields where the AI extraction got it wrong (AI value vs User's corrected value)

For each diff, analyze WHY the AI might have extracted incorrectly and suggest how to improve the extraction prompt or regex rules.

Return JSON format:
{
  "suggestions": [
    {
      "field": "fieldName",
      "issue": "brief description of what went wrong",
      "fix": "specific suggestion to improve extraction"
    }
  ],
  "summary": "one-line overall summary"
}

Return ONLY raw JSON, no markdown.`;

/**
 * Compare AI-extracted data with user-corrected data, return diffs
 */
export function computeDiffs(
    aiOutput: Partial<ListingAgreementData>,
    userOutput: ListingAgreementData
): DiffEntry[] {
    const diffs: DiffEntry[] = [];
    const fieldsToCompare: (keyof ListingAgreementData)[] = [
        'company', 'jurisdiction', 'address', 'listingdate',
        'amount', 'amountInWords', 'token', 'signdate',
        'signname', 'marketingamount', 'marketinginwords',
        'tradingpair', 'wallets'
    ];

    for (const field of fieldsToCompare) {
        const aiVal = String(aiOutput[field] || '').trim();
        const userVal = String(userOutput[field] || '').trim();
        // Only log if AI had a value and user changed it, or AI missed it and user filled it
        if (aiVal !== userVal && (aiVal || userVal)) {
            diffs.push({ field, aiValue: aiVal, userValue: userVal });
        }
    }

    return diffs;
}

/**
 * Call AI to analyze the diffs and suggest prompt improvements
 */
export async function analyzePromptDiff(
    emailText: string,
    diffs: DiffEntry[],
    apiKey: string
): Promise<string> {
    if (diffs.length === 0) return '';

    const diffText = diffs.map(d =>
        `- ${d.field}: AI="${d.aiValue}" → User corrected to="${d.userValue}"`
    ).join('\n');

    const userPrompt = `Email text (first 500 chars):\n${emailText.substring(0, 500)}\n\nDiffs:\n${diffText}`;

    // Try each built-in model
    for (const model of BUILTIN_FALLBACK_MODELS) {
        try {
            const result = await analyzeWithAI(userPrompt, {
                apiKey,
                baseUrl: model.baseUrl,
                model: model.model,
            });
            return JSON.stringify(result, null, 2);
        } catch {
            continue;
        }
    }

    // If AI fails, return a simple text summary
    return `AI analysis unavailable. Diffs:\n${diffText}`;
}

/**
 * Save optimization log to cloud
 */
export async function saveOptimizationLog(entry: OptimizationLogEntry): Promise<boolean> {
    try {
        const res = await fetch('/api/optimization-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
        });
        return res.ok;
    } catch {
        console.warn('[prompt-optimizer] Failed to save log to cloud.');
        return false;
    }
}

/**
 * Get all optimization logs from cloud
 */
export async function getOptimizationLogs(): Promise<OptimizationLogEntry[]> {
    try {
        const res = await fetch('/api/optimization-log');
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

/**
 * Clear all optimization logs
 */
export async function clearOptimizationLogs(): Promise<boolean> {
    try {
        const res = await fetch('/api/optimization-log', { method: 'DELETE' });
        return res.ok;
    } catch {
        return false;
    }
}
