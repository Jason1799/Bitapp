// KYC Field Extraction — TypeScript (no Pyodide needed)
// Direct port of logic.py extract_kyc_fields for instant execution

// --- Label Definitions ---

const KYC_LABELS: Record<string, string[]> = {
    account_id: ["account id", "account id with bitmart", "cid"],
    name: ["姓名", "name", "full name"],
    country: ["国家", "国籍", "country"],
    gender: ["性别", "gender"],
    id_expired: [
        "证件是否过期", "是否过期", "证件过期", "证件是否有效",
        "id expired", "expired",
    ],
    id_expiry: [
        "证件过期时间", "过期时间", "证件到期时间", "到期时间",
        "有效期", "证件有效期",
        "id expiry date", "expiry date", "expiration date",
    ],
    id_type: [
        "证件类型", "证件类别", "证件种类",
        "id type", "document type",
    ],
    id_number: [
        "证件号", "证件号码", "证件编号",
        "id number", "document number",
    ],
    dob: ["生日", "出生日期", "date of birth", "dob"],
    submit_time: ["提交时间", "提交日期", "submit time"],
    review_time: ["审核时间", "审核日期", "review time"],
    submit_ip: [
        "提交IP", "提交 IP", "提交ip", "提交IP地址",
        "submit ip",
    ],
    ip_location: [
        "IP归属地", "IP 归属地", "IP所在地", "IP所属地", "ip归属地",
        "ip location",
    ],
    device_id: [
        "提交设备", "设备ID", "设备id", "设备编号", "设备标识",
        "device id", "submit device", "submit device id", "device identifier",
    ],
    device_type: ["设备类型", "设备类别", "device type"],
    channel: [
        "认证渠道", "认证方式",
        "channel", "verification channel", "kyc channel",
    ],
};

// --- Value Normalization Maps ---

const GENDER_MAP: Record<string, string> = {
    "男": "Male", "女": "Female", "未知": "Unknown",
    "男性": "Male", "女性": "Female", "其他": "Other",
};

const ID_TYPE_MAP: Record<string, string> = {
    "驾驶证": "Driver's License", "驾照": "Driver's License",
    "护照": "Passport", "身份证": "Identity Card", "居民身份证": "Identity Card",
    "通行证": "Travel Permit", "港澳通行证": "Travel Permit", "台湾通行证": "Travel Permit",
    "居留证": "Residence Permit", "居住证": "Residence Permit",
    "军官证": "Military ID", "士兵证": "Military ID",
    "回乡证": "Home Return Permit",
};

const ID_EXPIRED_MAP: Record<string, string> = {
    "未过期": "Not Expired", "过期": "Expired", "已过期": "Expired",
    "有效": "Not Expired", "无效": "Expired",
    "是": "Expired", "否": "Not Expired",
};

// --- Sorted Labels (longest first) ---

type LabelEntry = { label: string; key: string };
const SORTED_LABELS: LabelEntry[] = [];
for (const [key, labels] of Object.entries(KYC_LABELS)) {
    for (const label of labels) {
        SORTED_LABELS.push({ label, key });
    }
}
SORTED_LABELS.sort((a, b) => b.label.length - a.label.length);

// --- Helpers ---

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanLine(line: string): string {
    let s = line.trim();
    if (s === "-" || s === "—" || s === "–") return s;
    s = s.replace(/^(?:[-–—]\s+|[•·]\s+)/, "");
    return s.trim();
}

function normalizeValue(key: string, value: string): string {
    const v = value.trim();
    if (!v) return v;
    if (key === "gender") return GENDER_MAP[v] || v;
    if (key === "id_type") return ID_TYPE_MAP[v] || v;
    if (key === "id_expired") return ID_EXPIRED_MAP[v] || v;
    if (key === "device_id") return v.replace(/^(?:id|device\s*id)\s*[：:]\s*/i, "");
    return v;
}

function isLabelLine(line: string): boolean {
    const candidate = line.trim();
    if (!candidate) return false;
    for (const { label } of SORTED_LABELS) {
        const re = new RegExp(`^${escapeRegex(label)}\\s*[：:]?\\s*$`, "i");
        if (re.test(candidate)) return true;
    }
    return false;
}

function labelKey(line: string): string | null {
    const candidate = line.trim();
    if (!candidate) return null;
    for (const { label, key } of SORTED_LABELS) {
        const re = new RegExp(`^${escapeRegex(label)}\\s*[：:]?\\s*$`, "i");
        if (re.test(candidate)) return key;
    }
    return null;
}

// --- Main Extraction ---

export function extractKYCFields(text: string): Record<string, string> {
    const lines = text.split(/\r?\n/)
        .map(cleanLine)
        .filter(l => l.length > 0);

    const result: Record<string, string> = {};

    // Inline pair extraction
    for (const line of lines) {
        const occurrences: { start: number; end: number; key: string; labelLen: number }[] = [];
        for (const { label, key } of SORTED_LABELS) {
            const re = new RegExp(escapeRegex(label) + "\\s*[：:]?\\s*", "gi");
            let m: RegExpExecArray | null;
            while ((m = re.exec(line)) !== null) {
                occurrences.push({ start: m.index, end: m.index + m[0].length, key, labelLen: label.length });
            }
        }
        if (occurrences.length === 0) continue;

        // Sort by position, then by label length descending (longest first)
        occurrences.sort((a, b) => a.start - b.start || b.labelLen - a.labelLen);

        // Filter overlaps: keep longest at each position
        const filtered: { start: number; end: number; key: string }[] = [];
        let lastEnd = -1;
        for (const occ of occurrences) {
            if (occ.start < lastEnd) continue;
            filtered.push({ start: occ.start, end: occ.end, key: occ.key });
            lastEnd = occ.end;
        }

        for (let i = 0; i < filtered.length; i++) {
            const nextStart = i + 1 < filtered.length ? filtered[i + 1].start : line.length;
            let rawValue = line.slice(filtered[i].end, nextStart).trim();
            rawValue = rawValue.replace(/^[：:]+/, "").trim();
            if (!rawValue || isLabelLine(rawValue)) continue;
            const value = normalizeValue(filtered[i].key, rawValue);
            if (!(filtered[i].key in result) || value.length > result[filtered[i].key].length) {
                result[filtered[i].key] = value;
            }
        }
    }

    // Line-by-line extraction (longest label first)
    for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        for (const { label, key } of SORTED_LABELS) {
            const re = new RegExp(`^${escapeRegex(label)}\\s*[：:]?\\s*(.*)$`, "i");
            const match = line.match(re);
            if (!match) continue;

            let value = match[1].trim();
            if (value && isLabelLine(value)) value = "";

            if (!value) {
                let j = idx + 1;
                while (j < lines.length && !lines[j].trim()) j++;
                while (j < lines.length) {
                    const lk = labelKey(lines[j]);
                    if (lk === null) break;
                    if (lk !== key) break;
                    j++;
                    while (j < lines.length && !lines[j].trim()) j++;
                }
                if (j < lines.length && !isLabelLine(lines[j])) {
                    value = lines[j].trim();
                }
            }

            if (value) {
                result[key] = normalizeValue(key, value);
            }
            break; // First (longest) match wins
        }
    }

    return result;
}
