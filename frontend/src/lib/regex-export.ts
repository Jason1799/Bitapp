// Regex Rules Export - Generates a readable markdown document of all extraction rules

import { ListingAgreementData } from './types';

// Mirror of FIELD_PATTERNS from extraction.ts (exported as data for documentation)
const FIELD_PATTERNS_DOC: Record<string, { patterns: string[]; description: string }> = {
    company: {
        description: "Company Name / 公司名称",
        patterns: [
            String.raw`/company\s*名称\s*[:：]\s*(.+)/i`,
            String.raw`/company\s*name\s*[:：]\s*(.+)/i`,
            String.raw`/compny\s*name\s*[:：]\s*(.+)/i`,
            String.raw`/companyname\s*[:：]\s*(.+)/i`,
            String.raw`/company\s*nm\s*[:：]\s*(.+)/i`,
            String.raw`/company\s*[:：]\s*(.+)/i`,
            String.raw`/公司名称\s*[:：]\s*(.+)/i`,
        ]
    },
    jurisdiction: {
        description: "Jurisdiction / 管辖地",
        patterns: [
            String.raw`/Jurisdiction\s*管辖地\/国\s*[:：]\s*(.+)/i`,
            String.raw`/Jurisdiction\s*[:：]\s*(.+)/i`,
            String.raw`/管辖地\/国\s*[:：]\s*(.+)/i`,
            String.raw`/jurisdiction\s*[:：]\s*(.+)/i`,
        ]
    },
    address: {
        description: "Registered Address / 注册地址",
        patterns: [
            String.raw`/registered\s*address\s*[:：]\s*(.+)/i`,
            String.raw`/company\s*address\s*[:：]\s*(.+)/i`,
            String.raw`/addr\s*[:：]\s*(.+)/i`,
            String.raw`/address\s*公司地址\s*[:：]\s*(.+)/i`,
            String.raw`/address\s*[:：]\s*(.+)/i`,
            String.raw`/注册地址\s*[:：]\s*(.+)/i`,
            String.raw`/公司地址\s*[:：]\s*(.+)/i`,
        ]
    },
    signdate: {
        description: "Agreement Sign Date / 签署日期",
        patterns: [
            String.raw`/合同签署date\s*[:：]\s*(.+)/i`,
            String.raw`/agreement\s*date\s*[:：]\s*(.+)/i`,
            String.raw`/signing\s*date\s*[:：]\s*(.+)/i`,
            String.raw`/date\s*[:：]\s*(.+)/i`,
        ]
    },
    listingdate: {
        description: "Listing Date / 上线日期",
        patterns: [
            String.raw`/上市日\s*[:：]\s*(.+)/i`,
            String.raw`/listing\s*date\s*[:：]\s*(.+)/i`,
            String.raw`/latest\s*date\s*[:：]\s*(.+)/i`,
            String.raw`/latest\s*listing\s*date\s*[:：]\s*(.+)/i`,
            String.raw`/listing\s*day\s*[:：]\s*(.+)/i`,
            String.raw`/listing\s*time\s*[:：]\s*(.+)/i`,
            String.raw`/list\s*date\s*[:：]\s*(.+)/i`,
            String.raw`/time\s*to\s*market\s*[:：]\s*(.+)/i`,
            String.raw`/最晚上线日期\s*[:：]\s*(.+)/i`,
            String.raw`/上线日期\s*[:：]\s*(.+)/i`,
            String.raw`/listing\s*[:：]\s*(.+)/i`,
        ]
    },
    token: {
        description: "Token Symbol / 代币名称",
        patterns: [
            String.raw`/token\s*代币名称\s*[:：]\s*(.+)/i`,
            String.raw`/token\s*ticker\s*[:：]\s*(.+)/i`,
            String.raw`/ticker\s*name\s*[:：]\s*(.+)/i`,
            String.raw`/ticker\s*[:：]\s*(.+)/i`,
            String.raw`/token\s*symbol\s*[:：]\s*(.+)/i`,
            String.raw`/symbol\s*[:：]\s*(.+)/i`,
            String.raw`/token\s*name\s*[:：]\s*(.+)/i`,
            String.raw`/token\s*[:：]\s*(.+)/i`,
            String.raw`/代币名称\s*[:：]\s*(.+)/i`,
        ]
    },
    amount: {
        description: "Listing Fee Amount / 上市费用金额",
        patterns: [
            String.raw`/listing\s*fee\s*amount\s*[:：]\s*(.+)/i`,
            String.raw`/listing\s*fee\s*[:：]\s*(.+)/i`,
            String.raw`/amount\s*[:：]\s*(.+)/i`,
        ]
    },
    amountInWords: {
        description: "Listing Fee in English Words (ALL CAPS)",
        patterns: [
            String.raw`/listing\s*fee\s*in\s*words\s*[:：]\s*(.+)/i`,
            String.raw`/money\s*上市费英文大写\s*[:：]\s*(.+)/i`,
            String.raw`/amountinwords\s*[:：]\s*(.+)/i`,
            String.raw`/英文大写\s*[:：]\s*(.+)/i`,
        ]
    },
    signname: {
        description: "Signer Full Name / 签署人",
        patterns: [
            String.raw`/签署人\s*1\s*[:：]\s*(.+)/i`,
            String.raw`/signer\s*full\s*name\s*[:：]\s*(.+)/i`,
            String.raw`/signer\s*name\s*[:：]\s*(.+)/i`,
            String.raw`/full\s*legal\s*name\s*[:：]\s*(.+)/i`,
            String.raw`/signer\s*[:：]\s*(.+)/i`,
            String.raw`/name1\s*[:：]\s*(.+)/i`,
        ]
    },
    marketingamount: {
        description: "Marketing Fee Amount / 营销费用金额",
        patterns: [
            String.raw`/marketing\s*amount\s*[:：]\s*(.+)/i`,
            String.raw`/marketing\s*fee\s*[:：]\s*(.+)/i`,
            String.raw`/marketing\s*[:：]\s*(.+)/i`,
        ]
    },
    marketinginwords: {
        description: "Marketing Fee in English Words (ALL CAPS)",
        patterns: [
            String.raw`/marketing\s*in\s*words\s*[:：]\s*(.+)/i`,
            String.raw`/marketing\s*fee\s*words\s*[:：]\s*(.+)/i`,
        ]
    },
    tradingpair: {
        description: "Trading Pair / 交易对",
        patterns: [
            String.raw`/trading\s*pair\s*[:：]\s*(.+)/i`,
            String.raw`/pair\s*[:：]\s*(.+)/i`,
        ]
    },
};

const COUNTRY_KEYWORDS_DOC: Record<string, string> = {
    "indonesia": "Indonesia", "jakarta": "Indonesia",
    "singapore": "Singapore",
    "hong kong": "Hong Kong",
    "cayman": "Cayman Islands",
    "british virgin islands": "British Virgin Islands", "bvi": "British Virgin Islands", "tortola": "British Virgin Islands",
    "seychelles": "Seychelles",
    "united states": "United States", "usa": "United States",
    "united kingdom": "United Kingdom", "uk": "United Kingdom", "london": "United Kingdom",
    "st. vincent and the grenadines": "St. Vincent and the Grenadines", "st. vincent": "St. Vincent and the Grenadines",
    "romania": "Romania", "bucuresti": "Romania", "bucharest": "Romania", "judet": "Romania", "municipiul": "Romania",
    "estonia": "Estonia", "tallinn": "Estonia",
    "lithuania": "Lithuania", "vilnius": "Lithuania",
    "malta": "Malta", "switzerland": "Switzerland", "cyprus": "Cyprus", "gibraltar": "Gibraltar", "liechtenstein": "Liechtenstein",
    "japan": "Japan", "korea": "South Korea", "australia": "Australia", "india": "India",
    "vietnam": "Vietnam", "thailand": "Thailand", "philippines": "Philippines", "malaysia": "Malaysia", "taiwan": "Taiwan",
    "dubai": "UAE", "abu dhabi": "UAE", "united arab emirates": "UAE", "bahrain": "Bahrain",
    "panama": "Panama", "canada": "Canada", "bermuda": "Bermuda",
    "marshall islands": "Marshall Islands", "samoa": "Samoa", "labuan": "Malaysia (Labuan)",
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
    md += `Each field is matched against a list of regex patterns in order. The first match wins.\n\n`;

    for (const [field, info] of Object.entries(FIELD_PATTERNS_DOC)) {
        md += `### ${field} — ${info.description}\n`;
        md += `| # | Pattern |\n|---|---|\n`;
        info.patterns.forEach((p, i) => {
            md += `| ${i + 1} | \`${p}\` |\n`;
        });
        md += `\n`;
    }

    // Section 2: Country Keywords
    md += `## 2. Jurisdiction Fallback — Country Keywords\n\n`;
    md += `If regex fails to extract jurisdiction, the full text is scanned for these keywords:\n\n`;
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
    md += `## 4. Special Logic\n\n`;
    md += `- **Amount normalization**: Commas are stripped (e.g., "30,000" → "30000")\n`;
    md += `- **Signer name fallback**: If no signer pattern matches, tries \`/Name\\s*[:：]\\s*(.+)/i\`\n`;
    md += `- **Technical fee detection**: Currently defaults to \`true\` (always include)\n`;
    md += `- **Amount formatting**: Display adds commas back (60000 → 60,000)\n`;
    md += `- **Date format**: Expected output is "Month DD, YYYY" (e.g., "February 11, 2026")\n\n`;

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
