import { ListingAgreementData } from "./types";

// ==========================================
// Prefix pattern: handles bullet points (• * - ●), numbered lists (1. 2.),
// optional leading whitespace, and mixed CN/EN labels
// ==========================================
const P = `(?:[•\\*\\-●]\\s*|\\d+[.)、]\\s*)?`; // Optional bullet/number prefix
const SEP = `\\s*[:：]\\s*`; // Colon separator (EN or CN)

const FIELD_PATTERNS: Record<string, RegExp[]> = {
    company: [
        new RegExp(`${P}company\\s*名称${SEP}(.+)`, 'i'),
        new RegExp(`${P}company\\s*name${SEP}(.+)`, 'i'),
        new RegExp(`${P}compny\\s*name${SEP}(.+)`, 'i'),
        new RegExp(`${P}companyname${SEP}(.+)`, 'i'),
        new RegExp(`${P}company\\s*nm${SEP}(.+)`, 'i'),
        new RegExp(`${P}legal\\s*entity\\s*name${SEP}(.+)`, 'i'),
        new RegExp(`${P}entity\\s*name${SEP}(.+)`, 'i'),
        new RegExp(`${P}project\\s*entity${SEP}(.+)`, 'i'),
        new RegExp(`${P}company${SEP}(.+)`, 'i'),
        new RegExp(`${P}公司名称${SEP}(.+)`, 'i'),
        new RegExp(`${P}公司名${SEP}(.+)`, 'i'),
    ],
    jurisdiction: [
        new RegExp(`${P}jurisdiction\\s*管辖地[/\\/]国${SEP}(.+)`, 'i'),
        new RegExp(`${P}jurisdiction\\s*[/\\/]\\s*country${SEP}(.+)`, 'i'),
        new RegExp(`${P}country\\s*of\\s*incorporation${SEP}(.+)`, 'i'),
        new RegExp(`${P}incorporation\\s*country${SEP}(.+)`, 'i'),
        new RegExp(`${P}jurisdiction${SEP}(.+)`, 'i'),
        new RegExp(`${P}管辖地[/\\/]国${SEP}(.+)`, 'i'),
        new RegExp(`${P}管辖地${SEP}(.+)`, 'i'),
        new RegExp(`${P}注册国家${SEP}(.+)`, 'i'),
    ],
    address: [
        new RegExp(`${P}registered\\s*address${SEP}(.+)`, 'i'),
        new RegExp(`${P}company\\s*address${SEP}(.+)`, 'i'),
        new RegExp(`${P}business\\s*address${SEP}(.+)`, 'i'),
        new RegExp(`${P}office\\s*address${SEP}(.+)`, 'i'),
        new RegExp(`${P}addr${SEP}(.+)`, 'i'),
        new RegExp(`${P}address\\s*公司地址${SEP}(.+)`, 'i'),
        new RegExp(`${P}address${SEP}(.+)`, 'i'),
        new RegExp(`${P}注册地址${SEP}(.+)`, 'i'),
        new RegExp(`${P}公司地址${SEP}(.+)`, 'i'),
        new RegExp(`${P}地址${SEP}(.+)`, 'i'),
    ],
    signdate: [
        new RegExp(`${P}合同签署\\s*date${SEP}(.+)`, 'i'),
        new RegExp(`${P}agreement\\s*date${SEP}(.+)`, 'i'),
        new RegExp(`${P}signing\\s*date${SEP}(.+)`, 'i'),
        new RegExp(`${P}sign\\s*date${SEP}(.+)`, 'i'),
        new RegExp(`${P}contract\\s*date${SEP}(.+)`, 'i'),
        new RegExp(`${P}签署日期${SEP}(.+)`, 'i'),
        new RegExp(`${P}签约日期${SEP}(.+)`, 'i'),
        new RegExp(`${P}date${SEP}(.+)`, 'i'),
    ],
    listingdate: [
        new RegExp(`${P}latest\\s*listing\\s*date${SEP}(.+)`, 'i'),
        new RegExp(`${P}listing\\s*date${SEP}(.+)`, 'i'),
        new RegExp(`${P}latest\\s*date${SEP}(.+)`, 'i'),
        new RegExp(`${P}launch\\s*date${SEP}(.+)`, 'i'),
        new RegExp(`${P}go\\s*live\\s*date${SEP}(.+)`, 'i'),
        new RegExp(`${P}listing\\s*day${SEP}(.+)`, 'i'),
        new RegExp(`${P}listing\\s*time${SEP}(.+)`, 'i'),
        new RegExp(`${P}list\\s*date${SEP}(.+)`, 'i'),
        new RegExp(`${P}time\\s*to\\s*market${SEP}(.+)`, 'i'),
        new RegExp(`${P}expected\\s*listing${SEP}(.+)`, 'i'),
        new RegExp(`${P}target\\s*listing${SEP}(.+)`, 'i'),
        new RegExp(`${P}上市日${SEP}(.+)`, 'i'),
        new RegExp(`${P}最晚上线日期${SEP}(.+)`, 'i'),
        new RegExp(`${P}上线日期${SEP}(.+)`, 'i'),
        new RegExp(`${P}上币日期${SEP}(.+)`, 'i'),
        new RegExp(`${P}listing${SEP}(.+)`, 'i'),
    ],
    token: [
        new RegExp(`${P}token\\s*代币名称${SEP}(.+)`, 'i'),
        new RegExp(`${P}token\\s*ticker${SEP}(.+)`, 'i'),
        new RegExp(`${P}ticker\\s*name${SEP}(.+)`, 'i'),
        new RegExp(`${P}ticker${SEP}(.+)`, 'i'),
        new RegExp(`${P}token\\s*symbol${SEP}(.+)`, 'i'),
        new RegExp(`${P}coin\\s*name${SEP}(.+)`, 'i'),
        new RegExp(`${P}coin${SEP}(.+)`, 'i'),
        new RegExp(`${P}symbol${SEP}(.+)`, 'i'),
        new RegExp(`${P}token\\s*name${SEP}(.+)`, 'i'),
        new RegExp(`${P}token${SEP}(.+)`, 'i'),
        new RegExp(`${P}代币名称${SEP}(.+)`, 'i'),
        new RegExp(`${P}代币${SEP}(.+)`, 'i'),
    ],
    amount: [
        new RegExp(`${P}listing\\s*fee\\s*amount${SEP}(.+)`, 'i'),
        new RegExp(`${P}listing\\s*fee\\s*\\(USD\\)${SEP}(.+)`, 'i'),
        new RegExp(`${P}listing\\s*fee\\s*\\(USDT\\)${SEP}(.+)`, 'i'),
        new RegExp(`${P}listing\\s*fee${SEP}(.+)`, 'i'),
        new RegExp(`${P}上市费用\\s*金额${SEP}(.+)`, 'i'),
        new RegExp(`${P}上市费用${SEP}(.+)`, 'i'),
        new RegExp(`${P}上市费${SEP}(.+)`, 'i'),
        new RegExp(`${P}fee\\s*amount${SEP}(.+)`, 'i'),
        new RegExp(`${P}amount${SEP}(.+)`, 'i'),
    ],
    amountInWords: [
        new RegExp(`${P}listing\\s*fee\\s*in\\s*words${SEP}(.+)`, 'i'),
        new RegExp(`${P}amount\\s*in\\s*words${SEP}(.+)`, 'i'),
        new RegExp(`${P}fee\\s*in\\s*words${SEP}(.+)`, 'i'),
        new RegExp(`${P}money\\s*上市费英文大写${SEP}(.+)`, 'i'),
        new RegExp(`${P}amountinwords${SEP}(.+)`, 'i'),
        new RegExp(`${P}amount\\s*in\\s*english${SEP}(.+)`, 'i'),
        new RegExp(`${P}英文大写${SEP}(.+)`, 'i'),
        new RegExp(`${P}金额大写${SEP}(.+)`, 'i'),
    ],
    signname: [
        new RegExp(`${P}签署人\\s*1${SEP}(.+)`, 'i'),
        new RegExp(`${P}签署人${SEP}(.+)`, 'i'),
        new RegExp(`${P}signer\\s*full\\s*name${SEP}(.+)`, 'i'),
        new RegExp(`${P}signer\\s*name${SEP}(.+)`, 'i'),
        new RegExp(`${P}full\\s*legal\\s*name${SEP}(.+)`, 'i'),
        new RegExp(`${P}legal\\s*name${SEP}(.+)`, 'i'),
        new RegExp(`${P}authorized\\s*signer${SEP}(.+)`, 'i'),
        new RegExp(`${P}representative\\s*name${SEP}(.+)`, 'i'),
        new RegExp(`${P}contact\\s*person${SEP}(.+)`, 'i'),
        new RegExp(`${P}signer${SEP}(.+)`, 'i'),
        new RegExp(`${P}name1${SEP}(.+)`, 'i'),
    ],
    marketingamount: [
        new RegExp(`${P}marketing\\s*(?:fee\\s*)?amount${SEP}(.+)`, 'i'),
        new RegExp(`${P}marketing\\s*fee\\s*\\(USD\\)${SEP}(.+)`, 'i'),
        new RegExp(`${P}marketing\\s*fee\\s*\\(USDT\\)${SEP}(.+)`, 'i'),
        new RegExp(`${P}marketing\\s*fee${SEP}(.+)`, 'i'),
        new RegExp(`${P}promotional\\s*fee${SEP}(.+)`, 'i'),
        new RegExp(`${P}promotion\\s*fee${SEP}(.+)`, 'i'),
        new RegExp(`${P}营销费用${SEP}(.+)`, 'i'),
        new RegExp(`${P}推广费${SEP}(.+)`, 'i'),
        new RegExp(`${P}marketing${SEP}(.+)`, 'i'),
    ],
    marketinginwords: [
        new RegExp(`${P}marketing\\s*(?:fee\\s*)?in\\s*words${SEP}(.+)`, 'i'),
        new RegExp(`${P}marketing\\s*fee\\s*words${SEP}(.+)`, 'i'),
        new RegExp(`${P}marketing\\s*amount\\s*in\\s*words${SEP}(.+)`, 'i'),
        new RegExp(`${P}marketing\\s*in\\s*english${SEP}(.+)`, 'i'),
        new RegExp(`${P}营销费大写${SEP}(.+)`, 'i'),
    ],
    tradingpair: [
        new RegExp(`${P}trading\\s*pair[s]?${SEP}(.+)`, 'i'),
        new RegExp(`${P}trade\\s*pair[s]?${SEP}(.+)`, 'i'),
        new RegExp(`${P}pair[s]?${SEP}(.+)`, 'i'),
        new RegExp(`${P}交易对${SEP}(.+)`, 'i'),
    ],
    wallets: [
        new RegExp(`${P}wallet\\s*address(?:es)?${SEP}(.+)`, 'i'),
        new RegExp(`${P}deposit\\s*address(?:es)?${SEP}(.+)`, 'i'),
        new RegExp(`${P}钱包地址${SEP}(.+)`, 'i'),
        new RegExp(`${P}wallet[s]?${SEP}(.+)`, 'i'),
    ],
};

const COUNTRY_KEYWORDS: Record<string, string> = {
    // Common crypto jurisdictions
    "indonesia": "Indonesia",
    "jakarta": "Indonesia",
    "singapore": "Singapore",
    "hong kong": "Hong Kong",
    "cayman": "Cayman Islands",
    "cayman islands": "Cayman Islands",
    "british virgin islands": "British Virgin Islands",
    "bvi": "British Virgin Islands",
    "tortola": "British Virgin Islands",
    "seychelles": "Seychelles",
    "mahe": "Seychelles",
    "united states": "United States",
    "usa": "United States",
    "delaware": "United States",
    "wyoming": "United States",
    "new york": "United States",
    "united kingdom": "United Kingdom",
    "uk": "United Kingdom",
    "london": "United Kingdom",
    "st. vincent and the grenadines": "St. Vincent and the Grenadines",
    "st vincent and the grenadines": "St. Vincent and the Grenadines",
    "saint vincent": "St. Vincent and the Grenadines",
    "st. vincent": "St. Vincent and the Grenadines",
    // European
    "romania": "Romania",
    "bucuresti": "Romania",
    "bucharest": "Romania",
    "judet": "Romania",
    "municipiul": "Romania",
    "estonia": "Estonia",
    "tallinn": "Estonia",
    "lithuania": "Lithuania",
    "vilnius": "Lithuania",
    "malta": "Malta",
    "switzerland": "Switzerland",
    "zurich": "Switzerland",
    "zug": "Switzerland",
    "cyprus": "Cyprus",
    "nicosia": "Cyprus",
    "limassol": "Cyprus",
    "gibraltar": "Gibraltar",
    "liechtenstein": "Liechtenstein",
    "ireland": "Ireland",
    "dublin": "Ireland",
    "netherlands": "Netherlands",
    "luxembourg": "Luxembourg",
    // Asia Pacific
    "japan": "Japan",
    "tokyo": "Japan",
    "korea": "South Korea",
    "seoul": "South Korea",
    "australia": "Australia",
    "sydney": "Australia",
    "india": "India",
    "mumbai": "India",
    "vietnam": "Vietnam",
    "hanoi": "Vietnam",
    "ho chi minh": "Vietnam",
    "thailand": "Thailand",
    "bangkok": "Thailand",
    "philippines": "Philippines",
    "manila": "Philippines",
    "malaysia": "Malaysia",
    "kuala lumpur": "Malaysia",
    "taiwan": "Taiwan",
    "taipei": "Taiwan",
    "china": "China",
    "beijing": "China",
    "shanghai": "China",
    // Middle East
    "dubai": "UAE",
    "abu dhabi": "UAE",
    "united arab emirates": "UAE",
    "bahrain": "Bahrain",
    "qatar": "Qatar",
    "saudi arabia": "Saudi Arabia",
    // Americas
    "panama": "Panama",
    "canada": "Canada",
    "toronto": "Canada",
    "bermuda": "Bermuda",
    "brazil": "Brazil",
    "argentina": "Argentina",
    "mexico": "Mexico",
    // Africa
    "south africa": "South Africa",
    "nigeria": "Nigeria",
    "kenya": "Kenya",
    // Others
    "marshall islands": "Marshall Islands",
    "samoa": "Samoa",
    "labuan": "Malaysia (Labuan)",
    "nevis": "St. Kitts and Nevis",
    "belize": "Belize",
    "mauritius": "Mauritius",
    "curacao": "Curaçao",
};

const NUMBER_RE = /(?<!\w)(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g;

// ==========================================
// Date Normalization
// ==========================================
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Normalize various date formats to "Month DD, YYYY"
 * Supports: 2026-02-11, 02/11/2026, 11/2/26, Feb 11 2026, 11 Feb 2026, etc.
 */
export const normalizeDate = (raw: string): string => {
    const s = raw.trim();

    // Already in correct format: "February 11, 2026"
    const fullMatch = s.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})$/);
    if (fullMatch) return `${fullMatch[1]} ${parseInt(fullMatch[2])}, ${fullMatch[3]}`;

    // Short month: "Feb 11, 2026" or "Feb 11 2026"
    const shortMatch = s.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s*(\d{4})$/i);
    if (shortMatch) {
        const mIdx = MONTHS_SHORT.findIndex(m => m.toLowerCase() === shortMatch[1].substring(0, 3).toLowerCase());
        if (mIdx >= 0) return `${MONTHS[mIdx]} ${parseInt(shortMatch[2])}, ${shortMatch[3]}`;
    }

    // "11 Feb 2026" or "11 February 2026"
    const dmyWordMatch = s.match(/^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})$/i);
    if (dmyWordMatch) {
        const mIdx = MONTHS_SHORT.findIndex(m => m.toLowerCase() === dmyWordMatch[2].substring(0, 3).toLowerCase());
        if (mIdx >= 0) return `${MONTHS[mIdx]} ${parseInt(dmyWordMatch[1])}, ${dmyWordMatch[3]}`;
    }

    // ISO: "2026-02-11"
    const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
        const [, y, m, d] = isoMatch;
        const mi = parseInt(m) - 1;
        if (mi >= 0 && mi < 12) return `${MONTHS[mi]} ${parseInt(d)}, ${y}`;
    }

    // DD/MM/YYYY or MM/DD/YYYY — prefer DD/MM/YYYY for values > 12
    const slashMatch = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
    if (slashMatch) {
        let [, a, b, y] = slashMatch;
        let year = parseInt(y);
        if (year < 100) year += 2000;
        const numA = parseInt(a);
        const numB = parseInt(b);
        // If first number > 12, it must be day (DD/MM/YY)
        if (numA > 12 && numB <= 12) {
            return `${MONTHS[numB - 1]} ${numA}, ${year}`;
        }
        // If second > 12, first is month (MM/DD/YY)
        if (numB > 12 && numA <= 12) {
            return `${MONTHS[numA - 1]} ${numB}, ${year}`;
        }
        // Both <= 12: ambiguous — use "closest future date" disambiguation
        if (numA <= 12 && numB <= 12) {
            // Interpretation A: A=month, B=day (MM/DD/YYYY)
            const dateA = new Date(year, numA - 1, numB);
            // Interpretation B: A=day, B=month (DD/MM/YYYY)
            const dateB = new Date(year, numB - 1, numA);
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const diffA = dateA.getTime() - now.getTime();
            const diffB = dateB.getTime() - now.getTime();

            // Both in the future: pick the closer one
            if (diffA >= 0 && diffB >= 0) {
                if (diffA <= diffB) return `${MONTHS[numA - 1]} ${numB}, ${year}`;
                return `${MONTHS[numB - 1]} ${numA}, ${year}`;
            }
            // Only one in the future: pick it
            if (diffA >= 0) return `${MONTHS[numA - 1]} ${numB}, ${year}`;
            if (diffB >= 0) return `${MONTHS[numB - 1]} ${numA}, ${year}`;
            // Both in the past: pick the more recent one
            if (diffA >= diffB) return `${MONTHS[numA - 1]} ${numB}, ${year}`;
            return `${MONTHS[numB - 1]} ${numA}, ${year}`;
        }
    }

    return s; // Return as-is if no pattern matches
};

// --- Helper Functions ---

/**
 * Normalizes amount strings to numbers or formatted strings
 */
const normalizeAmount = (val: string): string => {
    // Handle "$90k" or "90K" → "90000"
    const kMatch = val.match(/\$?\s*(\d+(?:\.\d+)?)\s*[kK]/);
    if (kMatch) return String(Math.round(parseFloat(kMatch[1]) * 1000));

    // Handle "$90M" → "90000000"
    const mMatch = val.match(/\$?\s*(\d+(?:\.\d+)?)\s*[mM]/);
    if (mMatch) return String(Math.round(parseFloat(mMatch[1]) * 1000000));

    // Standard: strip $, commas, USDT, USD
    return val.replace(/[$,]/g, '').replace(/\s*(USDT|USD|usdt|usd)\s*/g, '').trim();
};

/**
 * Clean common trailing noise from extracted values
 */
const cleanTrail = (val: string): string => {
    // Remove trailing parenthetical notes like "(inclusive of...)" or "(if applicable)"
    return val.replace(/\s*\(.*\)\s*$/, '').trim();
};

/**
 * Extracts fields from text using regex patterns
 */
export const extractFields = (text: string): Partial<ListingAgreementData> => {
    const data: Partial<ListingAgreementData> = {};

    // 1. Basic Field Extraction
    for (const [key, patterns] of Object.entries(FIELD_PATTERNS)) {
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                let val = match[1].trim();
                // Clean trailing noise
                val = cleanTrail(val);

                if (key === 'amount' || key === 'marketingamount') {
                    const numMatch = val.match(NUMBER_RE);
                    if (numMatch) {
                        data[key as keyof ListingAgreementData] = normalizeAmount(numMatch[0]) as any;
                    } else {
                        data[key as keyof ListingAgreementData] = normalizeAmount(val) as any;
                    }
                } else if (key === 'signdate' || key === 'listingdate') {
                    data[key as keyof ListingAgreementData] = normalizeDate(val) as any;
                } else if (key === 'token') {
                    // Clean token: uppercase, remove quotes/parentheses
                    data.token = val.replace(/["'()]/g, '').split(/[\s,/]/)[0].toUpperCase();
                } else if (key === 'amountInWords' || key === 'marketinginwords') {
                    data[key as keyof ListingAgreementData] = val.toUpperCase() as any;
                } else {
                    data[key as keyof ListingAgreementData] = val as any;
                }
                break; // Stop after first match for this field
            }
        }
    }

    // 2. Fallback for Signer Name
    if (!data.signname) {
        // Try "Name:" but avoid matching "Company Name:" or "Token Name:"
        const nameMatch = text.match(/(?<!company\s)(?<!token\s)(?<!legal\s)(?<!entity\s)(?<!signer\s)(?<!full\s)Name\s*[:：]\s*(.+)/i);
        if (nameMatch && nameMatch[1]) {
            data.signname = cleanTrail(nameMatch[1].trim());
        }
    }

    // 3. Fallback for Jurisdiction (Keyword Search from address or full text)
    if (!data.jurisdiction) {
        // First try from address field
        const searchText = (data.address || '') + ' ' + text;
        const lowerText = searchText.toLowerCase();
        for (const [keyword, country] of Object.entries(COUNTRY_KEYWORDS)) {
            if (lowerText.includes(keyword)) {
                data.jurisdiction = country;
                break;
            }
        }
    }

    // 4. Fallback for Amount — look for number near "listing fee" or "USDT"
    if (!data.amount) {
        const feeContext = text.match(/listing\s*fee[^.]*?(\d{1,3}(?:,\d{3})+|\d+(?:,\d{3})*)/i);
        if (feeContext) {
            data.amount = normalizeAmount(feeContext[1]);
        }
    }

    // 5. Fallback for Trading Pair — look for pattern like "XXX/USDT"
    if (!data.tradingpair) {
        const pairMatch = text.match(/\b([A-Z]{2,10})\s*\/\s*(USDT|BTC|ETH|USDC|USD)\b/);
        if (pairMatch) {
            data.tradingpair = `${pairMatch[1]}/${pairMatch[2]}`;
        }
    }

    // 6. Wallet address extraction fallback — look for long hex strings
    if (!data.wallets) {
        const walletMatches = text.match(/\b(0x[a-fA-F0-9]{40}|T[a-zA-Z0-9]{33}|[13][a-zA-HJ-NP-Z0-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{39,59})\b/g);
        if (walletMatches && walletMatches.length > 0) {
            data.wallets = walletMatches.join('\n');
        }
    }

    return data;
};

export const detectTechnicalFee = (text: string): boolean => {
    const lower = text.toLowerCase();
    // Check for waive/waiver language
    if (lower.includes('waive') || lower.includes('waiver') || lower.includes('no technical fee') || lower.includes('免除')) {
        return false;
    }
    // Default to true
    return true;
};
