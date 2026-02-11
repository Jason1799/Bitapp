import { ListingAgreementData } from "./types";

const FIELD_PATTERNS: Record<string, RegExp[]> = {
    company: [
        /company\s*名称\s*[:：]\s*(.+)/i,
        /company\s*name\s*[:：]\s*(.+)/i,
        /compny\s*name\s*[:：]\s*(.+)/i,
        /companyname\s*[:：]\s*(.+)/i,
        /company\s*nm\s*[:：]\s*(.+)/i,
        /company\s*[:：]\s*(.+)/i,
        /公司名称\s*[:：]\s*(.+)/i,
    ],
    jurisdiction: [
        /Jurisdiction\s*管辖地\/国\s*[:：]\s*(.+)/i,
        /Jurisdiction\s*[:：]\s*(.+)/i,
        /管辖地\/国\s*[:：]\s*(.+)/i,
        /jurisdiction\s*[:：]\s*(.+)/i,
    ],
    address: [
        /registered\s*address\s*[:：]\s*(.+)/i,
        /company\s*address\s*[:：]\s*(.+)/i,
        /addr\s*[:：]\s*(.+)/i,
        /address\s*公司地址\s*[:：]\s*(.+)/i,
        /address\s*[:：]\s*(.+)/i,
        /注册地址\s*[:：]\s*(.+)/i,
        /公司地址\s*[:：]\s*(.+)/i,
    ],
    signdate: [
        /合同签署date\s*[:：]\s*(.+)/i,
        /agreement\s*date\s*[:：]\s*(.+)/i,
        /signing\s*date\s*[:：]\s*(.+)/i,
        /date\s*[:：]\s*(.+)/i,
    ],
    listingdate: [
        /上市日\s*[:：]\s*(.+)/i,
        /listing\s*date\s*[:：]\s*(.+)/i,
        /latest\s*date\s*[:：]\s*(.+)/i,
        /latest\s*listing\s*date\s*[:：]\s*(.+)/i,
        /listing\s*day\s*[:：]\s*(.+)/i,
        /listing\s*time\s*[:：]\s*(.+)/i,
        /list\s*date\s*[:：]\s*(.+)/i,
        /time\s*to\s*market\s*[:：]\s*(.+)/i,
        /最晚上线日期\s*[:：]\s*(.+)/i,
        /上线日期\s*[:：]\s*(.+)/i,
        /listing\s*[:：]\s*(.+)/i,
    ],
    token: [
        /token\s*代币名称\s*[:：]\s*(.+)/i,
        /token\s*ticker\s*[:：]\s*(.+)/i,
        /ticker\s*name\s*[:：]\s*(.+)/i,
        /ticker\s*[:：]\s*(.+)/i,
        /token\s*symbol\s*[:：]\s*(.+)/i,
        /symbol\s*[:：]\s*(.+)/i,
        /token\s*name\s*[:：]\s*(.+)/i,
        /token\s*[:：]\s*(.+)/i,
        /代币名称\s*[:：]\s*(.+)/i,
    ],
    amount: [
        /listing\s*fee\s*amount\s*[:：]\s*(.+)/i,
        /listing\s*fee\s*[:：]\s*(.+)/i,
        /amount\s*[:：]\s*(.+)/i,
    ],
    amountInWords: [
        /listing\s*fee\s*in\s*words\s*[:：]\s*(.+)/i,
        /money\s*上市费英文大写\s*[:：]\s*(.+)/i,
        /amountinwords\s*[:：]\s*(.+)/i,
        /英文大写\s*[:：]\s*(.+)/i,
    ],
    signname: [
        /签署人\s*1\s*[:：]\s*(.+)/i,
        /signer\s*full\s*name\s*[:：]\s*(.+)/i,
        /signer\s*name\s*[:：]\s*(.+)/i,
        /full\s*legal\s*name\s*[:：]\s*(.+)/i,
        /signer\s*[:：]\s*(.+)/i,
        /name1\s*[:：]\s*(.+)/i,
    ],
    marketingamount: [
        /marketing\s*amount\s*[:：]\s*(.+)/i,
        /marketing\s*fee\s*[:：]\s*(.+)/i,
        /marketing\s*[:：]\s*(.+)/i,
    ],
    marketinginwords: [
        /marketing\s*in\s*words\s*[:：]\s*(.+)/i,
        /marketing\s*fee\s*words\s*[:：]\s*(.+)/i,
    ],
    tradingpair: [
        /trading\s*pair\s*[:：]\s*(.+)/i,
        /pair\s*[:：]\s*(.+)/i,
    ],
};

const COUNTRY_KEYWORDS: Record<string, string> = {
    // Common crypto jurisdictions
    "indonesia": "Indonesia",
    "jakarta": "Indonesia",
    "singapore": "Singapore",
    "hong kong": "Hong Kong",
    "cayman": "Cayman Islands",
    "british virgin islands": "British Virgin Islands",
    "bvi": "British Virgin Islands",
    "tortola": "British Virgin Islands",
    "seychelles": "Seychelles",
    "united states": "United States",
    "usa": "United States",
    "united kingdom": "United Kingdom",
    "uk": "United Kingdom",
    "london": "United Kingdom",
    "st. vincent and the grenadines": "St. Vincent and the Grenadines",
    "st vincent and the grenadines": "St. Vincent and the Grenadines",
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
    "cyprus": "Cyprus",
    "gibraltar": "Gibraltar",
    "liechtenstein": "Liechtenstein",
    // Asia Pacific
    "japan": "Japan",
    "korea": "South Korea",
    "australia": "Australia",
    "india": "India",
    "vietnam": "Vietnam",
    "thailand": "Thailand",
    "philippines": "Philippines",
    "malaysia": "Malaysia",
    "taiwan": "Taiwan",
    // Middle East
    "dubai": "UAE",
    "abu dhabi": "UAE",
    "united arab emirates": "UAE",
    "bahrain": "Bahrain",
    // Americas
    "panama": "Panama",
    "canada": "Canada",
    "bermuda": "Bermuda",
    // Others
    "marshall islands": "Marshall Islands",
    "samoa": "Samoa",
    "labuan": "Malaysia (Labuan)",
};

const NUMBER_RE = /(?<!\w)(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g;

// --- Helper Functions ---

/**
 * Normalizes amount strings to numbers or formatted strings
 */
const normalizeAmount = (val: string): string => {
    return val.replace(/,/g, '').trim();
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
                const val = match[1].trim();
                // Specific cleanup if needed
                if (key === 'amount' || key === 'marketingamount') {
                    // Extract just the number if mixed with text
                    const numMatch = val.match(NUMBER_RE);
                    if (numMatch) {
                        data[key as keyof ListingAgreementData] = normalizeAmount(numMatch[0]) as any;
                    } else {
                        data[key as keyof ListingAgreementData] = val as any;
                    }
                } else {
                    data[key as keyof ListingAgreementData] = val as any;
                }
                break; // Stop after first match for this field
            }
        }
    }

    // 2. Fallback Logic for Signer Name ("Name:") if not found
    if (!data.signname) {
        const nameMatch = text.match(/Name\s*[:：]\s*(.+)/i);
        if (nameMatch && nameMatch[1]) {
            data.signname = nameMatch[1].trim();
        }
    }

    // 3. Fallback Logic for Jurisdiction (Keyword Search)
    if (!data.jurisdiction) {
        const lowerText = text.toLowerCase();
        for (const [keyword, country] of Object.entries(COUNTRY_KEYWORDS)) {
            if (lowerText.includes(keyword)) {
                data.jurisdiction = country;
                break;
            }
        }
    }

    // 4. Fallback for Amount (Search for "30,000" etc near "Listing Fee")
    // (Optional enhancement based on observation)

    return data;
};

export const detectTechnicalFee = (text: string): boolean => {
    // Default true, unless specific "waive" language found or template check
    // Simple heuristic: if text contains "Technical Fee" it might be relevant,
    // but the template logic often defaults to including it.
    // Let's assume default is TRUE.
    return true;
};
