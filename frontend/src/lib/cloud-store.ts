// Cloud Store Service - Reads/writes shared data via Cloudflare KV API

// ============== Types ==============

export interface CloudConfig {
    apiKey: string;
    baseUrl: string;
    model: string;
    extraJson: string;
}

export interface CloudHistoryItem {
    id: string;
    timestamp: number;
    type: 'listing' | 'kyc';
    inputText: string;
    outputData: any;
}

// ============== Config ==============

export async function getCloudConfig(): Promise<CloudConfig | null> {
    try {
        const res = await fetch('/api/config');
        if (!res.ok) return null;
        const data = await res.json();
        if (!data || !data.apiKey) return null;
        return data as CloudConfig;
    } catch {
        console.warn('[cloud-store] Failed to fetch cloud config, using local.');
        return null;
    }
}

export async function saveCloudConfig(config: CloudConfig): Promise<boolean> {
    try {
        const res = await fetch('/api/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        return res.ok;
    } catch {
        console.warn('[cloud-store] Failed to save cloud config.');
        return false;
    }
}

// ============== Prompt ==============

export async function getCloudPrompt(): Promise<string | null> {
    try {
        const res = await fetch('/api/prompt');
        if (!res.ok) return null;
        const data = await res.json();
        return data.prompt || null;
    } catch {
        console.warn('[cloud-store] Failed to fetch cloud prompt.');
        return null;
    }
}

export async function saveCloudPrompt(prompt: string): Promise<boolean> {
    try {
        const res = await fetch('/api/prompt', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });
        return res.ok;
    } catch {
        console.warn('[cloud-store] Failed to save cloud prompt.');
        return false;
    }
}

// ============== History ==============

export async function getCloudHistory(): Promise<CloudHistoryItem[]> {
    try {
        const res = await fetch('/api/history');
        if (!res.ok) return [];
        return await res.json();
    } catch {
        console.warn('[cloud-store] Failed to fetch cloud history.');
        return [];
    }
}

export async function addCloudHistory(item: CloudHistoryItem): Promise<boolean> {
    try {
        const res = await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
        });
        return res.ok;
    } catch {
        console.warn('[cloud-store] Failed to add cloud history.');
        return false;
    }
}

export async function clearCloudHistory(): Promise<boolean> {
    try {
        const res = await fetch('/api/history', {
            method: 'DELETE',
        });
        return res.ok;
    } catch {
        console.warn('[cloud-store] Failed to clear cloud history.');
        return false;
    }
}
