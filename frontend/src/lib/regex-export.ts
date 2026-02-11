// Regex Rules Export - Generates a readable markdown document of all extraction rules
// Synced with extraction.ts patterns

import { ListingAgreementData } from './types';

// NOTE: All patterns now support optional bullet/number prefix: (?:[•\*\-●]\s*|\d+[.)、]\s*)?
const PREFIX_NOTE = `> All patterns support optional bullet/number prefix (• * - 1. 2.) before the label.`;

// Mirror of FIELD_PATTERNS from extraction.ts (exported as data for documentation)
const FIELD_PATTERNS_DOC: Record<string, { patterns: string[]; description: string }> = {
    company: {
        description: "Company Name / 公司名称",
        patterns: [
            `company 名称`, `company name`, `compny name`, `companyname`, `company nm`,
            `legal entity name`, `entity name`, `project entity`,
            `company`, `公司名称`, `公司名`,
        ]
    },
    jurisdiction: {
        description: "Jurisdiction / 管辖地",
        patterns: [
            `jurisdiction 管辖地/国`, `jurisdiction / country`,
            `country of incorporation`, `incorporation country`,
            `jurisdiction`, `管辖地/国`, `管辖地`, `注册国家`,
        ]
    },
    address: {
        description: "Registered Address / 注册地址",
        patterns: [
            `registered address`, `company address`, `business address`, `office address`,
            `addr`, `address 公司地址`, `address`,
            `注册地址`, `公司地址`, `地址`,
        ]
    },
    signdate: {
        description: "Agreement Sign Date / 签署日期 (auto-normalized to Month DD, YYYY)",
        patterns: [
            `合同签署 date`, `agreement date`, `signing date`, `sign date`,
            `contract date`, `签署日期`, `签约日期`, `date`,
        ]
    },
    listingdate: {
        description: "Listing Date / 上线日期 (auto-normalized to Month DD, YYYY)",
        patterns: [
            `latest listing date`, `listing date`, `latest date`,
            `launch date`, `go live date`,
            `listing day`, `listing time`, `list date`,
            `time to market`, `expected listing`, `target listing`,
            `上市日`, `最晚上线日期`, `上线日期`, `上币日期`, `listing`,
        ]
    },
    token: {
        description: "Token Symbol / 代币名称 (auto-uppercased, first word extracted)",
        patterns: [
            `token 代币名称`, `token ticker`, `ticker name`, `ticker`,
            `token symbol`, `coin name`, `coin`, `symbol`,
            `token name`, `token`, `代币名称`, `代币`,
        ]
    },
    amount: {
        description: "Listing Fee Amount / 上市费用金额 (supports $90k, $, USDT stripping)",
        patterns: [
            `listing fee amount`, `listing fee (USD)`, `listing fee (USDT)`,
            `listing fee`, `上市费用 金额`, `上市费用`, `上市费`,
            `fee amount`, `amount`,
        ]
    },
    amountInWords: {
        description: "Listing Fee in English Words (auto-uppercased to ALL CAPS)",
        patterns: [
            `listing fee in words`, `amount in words`, `fee in words`,
            `money 上市费英文大写`, `amountinwords`, `amount in english`,
            `英文大写`, `金额大写`,
        ]
    },
    signname: {
        description: "Signer Full Name / 签署人",
        patterns: [
            `签署人 1`, `签署人`,
            `signer full name`, `signer name`, `full legal name`, `legal name`,
            `authorized signer`, `representative name`, `contact person`,
            `signer`, `name1`,
        ]
    },
    marketingamount: {
        description: "Marketing Fee Amount / 营销费用金额",
        patterns: [
            `marketing (fee) amount`, `marketing fee (USD)`, `marketing fee (USDT)`,
            `marketing fee`, `promotional fee`, `promotion fee`,
            `营销费用`, `推广费`, `marketing`,
        ]
    },
    marketinginwords: {
        description: "Marketing Fee in English Words (ALL CAPS)",
        patterns: [
            `marketing (fee) in words`, `marketing fee words`,
            `marketing amount in words`, `marketing in english`, `营销费大写`,
        ]
    },
    tradingpair: {
        description: "Trading Pair / 交易对",
        patterns: [
            `trading pair(s)`, `trade pair(s)`, `pair(s)`, `交易对`,
        ]
    },
    wallets: {
        description: "Wallet Address(es) / 钱包地址",
        patterns: [
            `wallet address(es)`, `deposit address(es)`, `钱包地址`, `wallet(s)`,
        ]
    },
};

const COUNTRY_KEYWORDS_DOC: Record<string, string> = {
    // Common crypto jurisdictions
    "indonesia": "Indonesia", "jakarta": "Indonesia",
    "singapore": "Singapore",
    "hong kong": "Hong Kong",
    "cayman": "Cayman Islands", "cayman islands": "Cayman Islands",
    "british virgin islands": "British Virgin Islands", "bvi": "British Virgin Islands", "tortola": "British Virgin Islands",
    "seychelles": "Seychelles", "mahe": "Seychelles",
    "united states": "United States", "usa": "United States", "delaware": "United States", "wyoming": "United States", "new york": "United States",
    "united kingdom": "United Kingdom", "uk": "United Kingdom", "london": "United Kingdom",
    "st. vincent and the grenadines": "St. Vincent and the Grenadines", "saint vincent": "St. Vincent and the Grenadines", "st. vincent": "St. Vincent and the Grenadines",
    // European
    "romania": "Romania", "bucuresti": "Romania", "bucharest": "Romania", "judet": "Romania", "municipiul": "Romania",
    "estonia": "Estonia", "tallinn": "Estonia",
    "lithuania": "Lithuania", "vilnius": "Lithuania",
    "malta": "Malta",
    "switzerland": "Switzerland", "zurich": "Switzerland", "zug": "Switzerland",
    "cyprus": "Cyprus", "nicosia": "Cyprus", "limassol": "Cyprus",
    "gibraltar": "Gibraltar", "liechtenstein": "Liechtenstein",
    "ireland": "Ireland", "dublin": "Ireland",
    "netherlands": "Netherlands", "luxembourg": "Luxembourg",
    // Asia Pacific
    "japan": "Japan", "tokyo": "Japan",
    "korea": "South Korea", "seoul": "South Korea",
    "australia": "Australia", "sydney": "Australia",
    "india": "India", "mumbai": "India",
    "vietnam": "Vietnam", "hanoi": "Vietnam", "ho chi minh": "Vietnam",
    "thailand": "Thailand", "bangkok": "Thailand",
    "philippines": "Philippines", "manila": "Philippines",
    "malaysia": "Malaysia", "kuala lumpur": "Malaysia",
    "taiwan": "Taiwan", "taipei": "Taiwan",
    "china": "China", "beijing": "China", "shanghai": "China",
    // Middle East
    "dubai": "UAE", "abu dhabi": "UAE", "united arab emirates": "UAE",
    "bahrain": "Bahrain", "qatar": "Qatar", "saudi arabia": "Saudi Arabia",
    // Americas
    "panama": "Panama", "canada": "Canada", "toronto": "Canada",
    "bermuda": "Bermuda", "brazil": "Brazil", "argentina": "Argentina", "mexico": "Mexico",
    // Africa
    "south africa": "South Africa", "nigeria": "Nigeria", "kenya": "Kenya",
    // Others
    "marshall islands": "Marshall Islands", "samoa": "Samoa", "labuan": "Malaysia (Labuan)",
    "nevis": "St. Kitts and Nevis", "belize": "Belize", "mauritius": "Mauritius", "curacao": "Curaçao",
};

const VALIDATION_RULES_DOC: Record<string, string> = {
    company: String.raw`/^[\u4e00-\u9fa5a-zA-Z\(\)（）\s\.&,]{2,100}$/`,
    jurisdiction: String.raw`/^[\u4e00-\u9fa5a-zA-Z\s,]{2,50}$/`,
    address: String.raw`/^[\u4e00-\u9fa5a-zA-Z0-9\s#\-\.,\(\)（）]{5,150}$/`,
    listingdate: String.raw`/^(January|...|December)\s(0?[1-9]|[12][0-9]|3[01]),\s\d{4}$/`,
    amount: String.raw`/^[\d,]+(\.\d{1,2})?$/`,
    amountInWords: String.raw`/^[A-Z\s\-]+$/`,
    token: String.raw`/^[A-Z0-9]{2,10}$/`,
    signdate: String.raw`/^(January|...|December)\s(0?[1-9]|[12][0-9]|3[01]),\s\d{4}$/`,
    signname: String.raw`/^[\u4e00-\u9fa5a-zA-Z\s\.]{2,50}$/`,
    marketingamount: String.raw`/^[\d,]+(\.\d{1,2})?$/`,
    marketinginwords: String.raw`/^[A-Z\s\-]+$/`,
    tradingpair: String.raw`/^[A-Z0-9]+\/[A-Z0-9]+$/`,
    wallets: String.raw`/^[\w\s:\n,.\-]{10,500}$/`,
};

/**
 * Generate a readable Markdown document of all regex extraction rules
 */
export function generateRegexRulesMarkdown(optimizationLogs?: any[]): string {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    let md = `# Bitapp Listing Agreement - Regex Extraction Rules\n`;
    md += `> Generated: ${now}\n\n`;

    // Section 1: Field Patterns
    md += `## 1. Field Extraction Patterns\n\n`;
    md += `Each field is matched against keyword labels (case-insensitive) followed by a colon.\n`;
    md += `${PREFIX_NOTE}\n\n`;

    for (const [field, info] of Object.entries(FIELD_PATTERNS_DOC)) {
        md += `### ${field} — ${info.description}\n`;
        md += `| # | Keyword Label |\n|---|---|\n`;
        info.patterns.forEach((p, i) => {
            md += `| ${i + 1} | \`${p}\` |\n`;
        });
        md += `\n`;
    }

    // Section 2: Country Keywords
    md += `## 2. Jurisdiction Fallback — Country Keywords (${Object.keys(COUNTRY_KEYWORDS_DOC).length} entries)\n\n`;
    md += `If regex fails to extract jurisdiction, address + full text is scanned for these keywords:\n\n`;
    md += `| Keyword | Maps To |\n|---|---|\n`;
    for (const [keyword, country] of Object.entries(COUNTRY_KEYWORDS_DOC)) {
        md += `| ${keyword} | ${country} |\n`;
    }
    md += `\n`;

    // Section 3: Validation Rules
    md += `## 3. Validation Rules\n\n`;
    md += `These regex patterns validate user input after extraction:\n\n`;
    md += `| Field | Validation Pattern |\n|---|---|\n`;
    for (const [field, pattern] of Object.entries(VALIDATION_RULES_DOC)) {
        md += `| ${field} | \`${pattern}\` |\n`;
    }
    md += `\n`;

    // Section 4: Special Logic
    md += `## 4. Special Logic & Auto-Processing\n\n`;
    md += `- **Bullet/Number prefix**: All patterns handle \`• * - 1. 2.\` prefixes before labels\n`;
    md += `- **Date normalization**: Auto-converts \`2026-02-11\`, \`02/11/2026\`, \`Feb 11, 2026\`, \`11 Feb 2026\` → \`February 11, 2026\`\n`;
    md += `- **Amount normalization**: Strips \`$\`, commas, \`USD\`/\`USDT\`; handles \`$90k\` → \`90000\`, \`$1.5M\` → \`1500000\`\n`;
    md += `- **Token auto-uppercase**: Extracts first word, removes quotes/parentheses, forces uppercase\n`;
    md += `- **Amount in words**: Auto-uppercased to ALL CAPS\n`;
    md += `- **Trailing noise cleanup**: Removes parenthetical notes like \`(inclusive of...)\`\n`;
    md += `- **Signer name fallback**: If no signer pattern matches, tries \`Name:\` (avoiding \`Company Name:\` etc.)\n`;
    md += `- **Jurisdiction fallback**: Scans address field first, then full text for country keywords\n`;
    md += `- **Amount fallback**: Searches for numbers near "listing fee" context\n`;
    md += `- **Trading pair fallback**: Detects \`XXX/USDT\` patterns anywhere in text\n`;
    md += `- **Wallet fallback**: Detects ETH (0x...), TRX (T...), BTC (1.../3.../bc1...) addresses\n`;
    md += `- **Technical fee detection**: Defaults to \`true\`, set to \`false\` if "waive"/"waiver"/"免除" found\n`;
    md += `- **Display formatting**: Amounts display with commas (60000 → 60,000)\n\n`;

    // Section 5: Optimization Logs (if available)
    if (optimizationLogs && optimizationLogs.length > 0) {
        md += `## 5. AI Optimization Logs (Recent)\n\n`;
        md += `These are fields where AI extraction was incorrect and users manually corrected:\n\n`;
        const recentLogs = optimizationLogs.slice(0, 20);
        for (const log of recentLogs) {
            md += `### Log ${new Date(log.timestamp).toLocaleString()}\n`;
            if (log.diffs && log.diffs.length > 0) {
                md += `| Field | AI Value | User Value |\n|---|---|---|\n`;
                for (const d of log.diffs) {
                    md += `| ${d.field} | ${d.aiValue || '(empty)'} | ${d.userValue || '(empty)'} |\n`;
                }
            }
            if (log.aiSuggestion) {
                md += `\n**AI Suggestion:**\n\`\`\`json\n${log.aiSuggestion}\n\`\`\`\n`;
            }
            md += `\n---\n\n`;
        }
    }

    return md;
}
