import { ListingAgreementData } from "./types";

export interface AIConfig {
    apiKey: string;
    model: string;
    baseUrl?: string;
}

// Built-in fallback model chain: Gemini 3 Pro → Gemini 3 Flash
export const BUILTIN_FALLBACK_MODELS: Array<{ model: string; baseUrl: string; label: string }> = [
    { model: "gemini-2.5-pro", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", label: "Gemini 2.5 Pro" },
    { model: "gemini-2.5-flash", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", label: "Gemini 2.5 Flash" },
    { model: "gemini-2.0-flash", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", label: "Gemini 2.0 Flash" },
];

export const DEFAULT_SYSTEM_PROMPT = `You are an expert legal document analyzer specializing in crypto listing agreements. Extract the following fields from the email/contract text into JSON format.

Fields to extract:
- company: Company Name (the project's legal entity name, e.g. "Ado Network SRL", "BitDAO Ltd.")
- jurisdiction: Jurisdiction / Country of incorporation. IMPORTANT: If not explicitly stated, you MUST infer it from:
  1. The registered address (e.g. address in Romania → "Romania", address in Jakarta → "Indonesia", address containing "Cayman" → "Cayman Islands")
  2. Company name suffix (e.g. "SRL" → Romania, "Pte. Ltd." → Singapore, "Ltd." with BVI address → "British Virgin Islands")
  3. Any mention of country in the text
  Common examples: Romania, Indonesia, Singapore, Cayman Islands, British Virgin Islands, Hong Kong, Seychelles, St. Vincent and the Grenadines, United States, United Kingdom, Panama, Marshall Islands, Estonia, Lithuania, Dubai/UAE
- address: Registered Address (full address string)
- listingdate: Listing Date / Latest Listing Date (format: Month DD, YYYY, e.g. "February 26, 2021")
- amount: Listing Fee Amount (number only, no currency symbol, no commas in output)
- amountInWords: Listing Fee Amount in English Words (ALL CAPS, e.g. "TEN THOUSAND")
- token: Token Symbol/Ticker (uppercase, e.g. "ADO", "BTC")
- signdate: Agreement Sign Date (format: Month DD, YYYY)
- signname: Signer Full Name
- marketingamount: Marketing/Promotional Fee Amount (number only)
- marketinginwords: Marketing Fee in English Words (ALL CAPS, e.g. "NINETY THOUSAND")
- tradingpair: Trading Pair(s) (e.g. "ADO/USDT")
- wallets: Wallet Addresses (all wallet addresses as a single string, preserve line breaks)

Rules:
1. For jurisdiction: NEVER leave empty if there is an address. Always infer the country from the address.
2. For dates: Convert any date format to "Month DD, YYYY" format. CRITICAL date disambiguation rules:
   - The current year is 2026. All listing agreements should have dates in 2025-2027 range.
   - For ambiguous short formats like "21/2/26", "3/1/26", prefer DD/M/YY interpretation (day/month/year):
     * "21/2/26" → February 21, 2026 (NOT 2021/Feb/26)
     * "3/1/26" → January 3, 2026
   - When you see a 2-digit number that could be a year, match it to 20XX. Prefer the interpretation that gives a FUTURE date (2025-2027), not a past date.
   - NEVER output a date before 2025. If the raw text suggests an old year (e.g. 2021, 2024), it is almost certainly a misparse — re-examine the format.
   - For "Latest date" or "Listing date" fields, the date should be in the near future (within 12 months from now).
   - Examples: "21/2/26" → "February 21, 2026", "26/3/1" → "March 1, 2026", "2026-02-26" → "February 26, 2026"
3. For amounts: Extract pure numbers. If text says "$90k" or "$90,000", output "90000".
4. For amountInWords/marketinginwords: Convert to ALL CAPS English words.
5. If a field truly cannot be determined, return empty string "".

Return ONLY raw JSON, no markdown, no explanation.`;

export const PROMPT_STORAGE_KEY = 'bitapp_custom_prompt';

export const getSystemPrompt = (): string => {
    const custom = localStorage.getItem(PROMPT_STORAGE_KEY);
    return custom || DEFAULT_SYSTEM_PROMPT;
};

export const analyzeWithAI = async (text: string, config: AIConfig): Promise<Partial<ListingAgreementData>> => {
    if (!config.apiKey) throw new Error("API Key is missing");

    const systemPrompt = getSystemPrompt();

    const userPrompt = `Text:\n${text}`;

    let baseUrl = config.baseUrl || "https://api.openai.com/v1";
    // Ensure no trailing slash
    let cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // Proxy Logic
    // Proxy Logic (Only in Dev)
    if (import.meta.env.DEV) {
        if (cleanBaseUrl.includes("integrate.api.nvidia.com")) {
            cleanBaseUrl = cleanBaseUrl.replace("https://integrate.api.nvidia.com", "/nvidia-api");
        } else if (cleanBaseUrl.includes("api.anthropic.com")) {
            cleanBaseUrl = cleanBaseUrl.replace("https://api.anthropic.com", "/anthropic-api");
        } else if (cleanBaseUrl.includes("generativelanguage.googleapis.com")) {
            cleanBaseUrl = cleanBaseUrl.replace("https://generativelanguage.googleapis.com", "/gemini-api");
        } else if (cleanBaseUrl.includes("api.deepseek.com")) {
            cleanBaseUrl = cleanBaseUrl.replace("https://api.deepseek.com", "/deepseek-api");
        } else if (cleanBaseUrl.includes("api.x.ai")) {
            cleanBaseUrl = cleanBaseUrl.replace("https://api.x.ai", "/grok-api");
        }
    }

    // Determine Provider & Endpoint
    const isAnthropic = cleanBaseUrl.includes("anthropic");
    const url = isAnthropic ? `${cleanBaseUrl}/v1/messages` : `${cleanBaseUrl}/chat/completions`;

    // Prepare Headers
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (isAnthropic) {
        headers["x-api-key"] = config.apiKey;
        headers["anthropic-version"] = "2023-06-01";
    } else {
        headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    // Prepare Body
    let body: any = {};

    if (isAnthropic) {
        body = {
            model: config.model || "claude-3-5-sonnet-20240620",
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
                { role: "user", content: userPrompt }
            ]
        };
    } else {
        // OpenAI Compatible
        body = {
            model: config.model || "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.1
        };

        // Add response_format ONLY if supported/needed
        // Gemini and OpenAI support it. DeepSeek and Grok might be stricter or default to text.
        // For safety, we'll rely on the prompt "Return ONLY raw JSON" unless it's OpenAI/Gemini/NVIDIA(some models).
        if (cleanBaseUrl.includes("openai.com") || cleanBaseUrl.includes("gemini")) {
            body.response_format = { type: "json_object" };
        }
    }

    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI Request Failed: ${response.status} ${errText}`);
    }

    const json = await response.json();
    let content = "";

    if (isAnthropic) {
        content = json.content[0]?.text || "";
    } else {
        content = json.choices[0]?.message?.content || "";
    }

    try {
        // Clean markdown code blocks if present
        const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Failed to parse AI response", content);
        throw new Error("Invalid JSON from AI");
    }
}
