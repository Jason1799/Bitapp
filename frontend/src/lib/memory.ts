export interface HistoryItem {
    id: string;
    timestamp: number;
    inputText: string;
    outputData: any;
    type: 'listing' | 'kyc';
}

const STORAGE_KEY = 'bitapp_history';

export const saveHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const history = getHistory();
    const newItem: HistoryItem = {
        ...item,
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
    };
    // Keep max 50 items
    const newHistory = [newItem, ...history].slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    return newItem;
};

export const getHistory = (): HistoryItem[] => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
};

export const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
};
