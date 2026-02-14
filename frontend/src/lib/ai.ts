import { ListingAgreementData } from "./types";

export interface AIConfig {
    apiKey: string;
    model: string;
    baseUrl?: string;
}

// Built-in fallback models: Gemini 3 Pro → Gemini 3 Flash
export const BUILTIN_FALLBACK_MODELS: Array<{ model: string; baseUrl: string; label: string }> = [
    { model: "gemini-3-pro-preview", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", label: "Gemini 3 Pro" },
    { model: "gemini-3-flash-preview", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", label: "Gemini 3 Flash" },
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
   - When you see a 2-digit number that could be a year (e.g. "26"), map it to 2026.
   - NEVER output a date before 2025.
   - AMBIGUOUS DATES (both numbers <= 12, e.g. "3/11/2026"): This could be March 11 OR November 3.
     * First identify the year (2026, or 26→2026).
     * Then for the remaining two numbers, consider BOTH interpretations as potential dates.
     * Pick the date that is CLOSEST TO TODAY in the FUTURE (today is approximately February 2026).
     * If both are in the future, pick the nearer one.
     * If only one is in the future, pick that one.
     * If both are in the past, pick the more recent one.
     * Examples (assuming today is Feb 13, 2026):
       "3/11/2026" → "March 11, 2026" (March 11 is closer future than November 3)
       "1/5/2026" → "May 1, 2026" (January 5 is past, May 1 is future)
       "6/12/2026" → "June 12, 2026" (June 12 is closer than December 6)
   - If one number is > 12, there is no ambiguity (e.g. "15/3/2026" → "March 15, 2026").
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
    if (import.meta.env.DEV) {
        // Development: Use Vite Proxy
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
    const targetUrl = isAnthropic ? `${cleanBaseUrl}/v1/messages` : `${cleanBaseUrl}/chat/completions`;

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
            temperature: 0.1,
            max_tokens: 2048
        };

        // Add response_format ONLY if supported/needed
        if (cleanBaseUrl.includes("openai.com") || cleanBaseUrl.includes("gemini")) {
            body.response_format = { type: "json_object" };
        }
    }

    // Production: Use Cloudflare Pages Function Proxy to avoid CORS
    let fetchUrl = targetUrl;
    const fetchHeaders = { ...headers };

    if (import.meta.env.PROD && !targetUrl.startsWith("/")) {
        fetchUrl = "/api/proxy";
        fetchHeaders["X-Target-Url"] = targetUrl;
    }

    const response = await fetch(fetchUrl, {
        method: "POST",
        headers: fetchHeaders,
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
