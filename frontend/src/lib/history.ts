import { ListingAgreementData } from './types';

export interface HistoryItem {
    id: string;
    timestamp: string;
    type: 'listing';
    inputText: string;
    outputData: ListingAgreementData;
}

const STORAGE_KEY = 'bitapp_history';

export const getHistory = (): HistoryItem[] => {
    try {
        const item = localStorage.getItem(STORAGE_KEY);
        return item ? JSON.parse(item) : [];
    } catch (e) {
        console.error("Failed to parse history", e);
        return [];
    }
};

export const saveHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const history = getHistory();
    const newItem: HistoryItem = {
        ...item,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
    };
    // Prepend and keep last 50
    const updated = [newItem, ...history].slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
};
