import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const formatDate = (date: Date): string => {
    return date.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
