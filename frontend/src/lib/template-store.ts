/**
 * Template Store - IndexedDB-based storage for Word templates
 * Supports uploading, listing, deleting custom .docx templates
 */

export interface TemplateRecord {
    id: string;
    name: string;         // Display name, e.g. "Company"
    fileName: string;     // Original file name
    data: ArrayBuffer;    // .docx binary data
    createdAt: string;
    isBuiltIn: boolean;
}

export interface TemplateInfo {
    id: string;
    name: string;
    fileName: string;
    createdAt: string;
    isBuiltIn: boolean;
    isOverridden?: boolean;  // true if built-in has been replaced with a custom file
}

const DB_NAME = 'bitapp_templates';
const DB_VERSION = 1;
const STORE_NAME = 'templates';
const OUTPUT_PATTERN_KEY = 'bitapp_output_pattern';
const DEFAULT_OUTPUT_PATTERN = 'Listing_Agreement_{token}';

// ---- IndexedDB helpers ----

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

function txStore(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
    const tx = db.transaction(STORE_NAME, mode);
    return tx.objectStore(STORE_NAME);
}

// ---- Built-in templates (fetched from /templates/) ----

const BUILT_IN_TEMPLATES: Omit<TemplateInfo, 'createdAt'>[] = [
    { id: '__builtin_company', name: 'Company', fileName: 'Company.docx', isBuiltIn: true },
    { id: '__builtin_company_waive', name: 'Company Waive', fileName: 'Company Waive.docx', isBuiltIn: true },
];

// ---- Public API ----

/**
 * Get the list of all templates (built-in + user-uploaded)
 */
export async function getAllTemplates(): Promise<TemplateInfo[]> {
    try {
        const db = await openDB();
        const store = txStore(db, 'readonly');
        const all: TemplateRecord[] = await new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        db.close();

        // Check which built-ins have overrides in IndexedDB
        const overrideIds = new Set(all.filter(r => r.id.startsWith('__builtin_')).map(r => r.id));

        const builtIn: TemplateInfo[] = BUILT_IN_TEMPLATES.map(t => ({
            ...t,
            createdAt: '',
            isOverridden: overrideIds.has(t.id),
        }));

        // User templates = non-builtin records
        const userTemplates: TemplateInfo[] = all
            .filter(r => !r.id.startsWith('__builtin_'))
            .map(({ data, ...rest }) => rest);

        return [...builtIn, ...userTemplates];
    } catch (e) {
        console.error('Failed to read templates from IndexedDB', e);
        const builtIn: TemplateInfo[] = BUILT_IN_TEMPLATES.map(t => ({ ...t, createdAt: '' }));
        return builtIn;
    }
}

/**
 * Save a new template from a File upload
 */
export async function saveTemplate(name: string, file: File): Promise<TemplateInfo> {
    const db = await openDB();
    const data = await file.arrayBuffer();
    const record: TemplateRecord = {
        id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        fileName: file.name,
        data,
        createdAt: new Date().toISOString(),
        isBuiltIn: false,
    };

    const store = txStore(db, 'readwrite');
    await new Promise<void>((resolve, reject) => {
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
    db.close();

    const { data: _, ...info } = record;
    return info;
}

/**
 * Delete a template by ID. For user templates, removes entirely.
 * For built-in overrides, use resetBuiltInTemplate instead.
 */
export async function deleteTemplate(id: string): Promise<void> {
    if (id.startsWith('__builtin_')) {
        throw new Error('Cannot delete built-in templates. Use resetBuiltInTemplate() to restore defaults.');
    }
    const db = await openDB();
    const store = txStore(db, 'readwrite');
    await new Promise<void>((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
    db.close();
}

/**
 * Replace a built-in template with a custom file.
 * Stores the override in IndexedDB using the same built-in ID.
 */
export async function replaceBuiltInTemplate(builtInId: string, file: File): Promise<void> {
    const builtIn = BUILT_IN_TEMPLATES.find(t => t.id === builtInId);
    if (!builtIn) throw new Error(`Not a built-in template: ${builtInId}`);

    const db = await openDB();
    const data = await file.arrayBuffer();
    const record: TemplateRecord = {
        id: builtInId,
        name: builtIn.name,
        fileName: file.name,
        data,
        createdAt: new Date().toISOString(),
        isBuiltIn: true,
    };
    const store = txStore(db, 'readwrite');
    await new Promise<void>((resolve, reject) => {
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
    db.close();
}

/**
 * Reset a built-in template back to the original (remove override from IndexedDB).
 */
export async function resetBuiltInTemplate(builtInId: string): Promise<void> {
    const db = await openDB();
    const store = txStore(db, 'readwrite');
    await new Promise<void>((resolve, reject) => {
        const req = store.delete(builtInId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
    db.close();
}

/**
 * Get template binary data by ID.
 * For built-in templates, checks IndexedDB for override first, then falls back to /templates/.
 */
export async function getTemplateData(id: string): Promise<Uint8Array> {
    // Always check IndexedDB first (handles both overrides and user uploads)
    try {
        const db = await openDB();
        const store = txStore(db, 'readonly');
        const record: TemplateRecord | undefined = await new Promise((resolve, reject) => {
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        db.close();
        if (record) return new Uint8Array(record.data);
    } catch (e) {
        console.warn('IndexedDB read failed, trying fallback', e);
    }

    // Fallback for built-in: fetch from server
    const builtIn = BUILT_IN_TEMPLATES.find(t => t.id === id);
    if (builtIn) {
        const response = await fetch(`/templates/${builtIn.fileName}`);
        if (!response.ok) throw new Error(`Template not found: ${builtIn.fileName}`);
        const buf = await response.arrayBuffer();
        return new Uint8Array(buf);
    }

    throw new Error(`Template not found: ${id}`);
}

// ---- Output Pattern ----

export function getOutputPattern(): string {
    return localStorage.getItem(OUTPUT_PATTERN_KEY) || DEFAULT_OUTPUT_PATTERN;
}

export function saveOutputPattern(pattern: string): void {
    if (pattern.trim() === DEFAULT_OUTPUT_PATTERN) {
        localStorage.removeItem(OUTPUT_PATTERN_KEY);
    } else {
        localStorage.setItem(OUTPUT_PATTERN_KEY, pattern.trim());
    }
}

export const DEFAULT_OUTPUT_PATTERN_VALUE = DEFAULT_OUTPUT_PATTERN;

/**
 * Format the output filename using regex-based variable replacement.
 * Supported variables: {token}, {company}, {date}, {template}
 */
export function formatOutputName(pattern: string, vars: Record<string, string>): string {
    let result = pattern;
    for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || 'Unknown');
    }
    // Sanitize filename
    result = result.replace(/[<>:"/\\|?*]/g, '_').trim();
    return result || 'Document';
}
