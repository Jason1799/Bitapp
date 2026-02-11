import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface DatePickerInputProps {
    value: string; // "Month DD, YYYY"
    onChange: (formatted: string) => void;
    className?: string;
    hasError?: boolean;
    placeholder?: string;
    warningMessage?: string;  // shown below input in red
}

function parseDateValue(value: string): Date | null {
    if (!value) return null;
    const match = value.match(/^(\w+)\s+(\d{1,2}),\s*(\d{4})$/);
    if (match) {
        const monthIdx = MONTHS.findIndex(m => m.toLowerCase() === match[1].toLowerCase());
        if (monthIdx >= 0) {
            return new Date(parseInt(match[3]), monthIdx, parseInt(match[2]));
        }
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

function formatDate(date: Date): string {
    return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
    value,
    onChange,
    className,
    hasError,
    placeholder = "Pick a date",
    warningMessage
}) => {
    const [open, setOpen] = useState(false);
    const parsed = parseDateValue(value);
    const today = new Date();

    const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
    const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());

    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Sync view when value changes externally
    useEffect(() => {
        if (parsed) {
            setViewYear(parsed.getFullYear());
            setViewMonth(parsed.getMonth());
        }
    }, [value]);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };

    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const selectDay = (day: number) => {
        const selected = new Date(viewYear, viewMonth, day);
        onChange(formatDate(selected));
        setOpen(false);
    };

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

    const isSelected = (day: number) => {
        if (!parsed) return false;
        return parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === day;
    };

    const isToday = (day: number) => {
        return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
    };

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex h-10 w-full items-center rounded-md border border-gray-200 bg-white px-3 text-sm transition-colors",
                    "hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1",
                    hasError && "border-red-500 bg-red-50",
                    warningMessage && "border-red-500 bg-red-50 ring-1 ring-red-300",
                    !value && "text-gray-400"
                )}
            >
                <svg className={cn("mr-2 h-4 w-4 shrink-0", warningMessage ? "text-red-500" : "text-gray-400")} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className={cn(warningMessage && "text-red-600 font-medium")}>{value || placeholder}</span>
                {warningMessage && (
                    <svg className="ml-auto h-4 w-4 text-red-500 shrink-0 animate-pulse" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                )}
            </button>
            {warningMessage && (
                <p className="text-[11px] text-red-600 mt-1 font-medium animate-in fade-in-50">⚠️ {warningMessage}</p>
            )}

            {/* Popup Calendar */}
            {open && (
                <div className="absolute top-full left-0 z-50 mt-1 w-[280px] rounded-lg border border-gray-200 bg-white p-3 shadow-lg animate-in fade-in-0 zoom-in-95">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <button
                            type="button"
                            onClick={prevMonth}
                            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                        >
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <span className="text-sm font-semibold text-gray-800">
                            {MONTHS[viewMonth]} {viewYear}
                        </span>
                        <button
                            type="button"
                            onClick={nextMonth}
                            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                        >
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>

                    {/* Day of Week Headers */}
                    <div className="grid grid-cols-7 mb-1">
                        {DAYS_SHORT.map(d => (
                            <div key={d} className="flex h-8 items-center justify-center text-xs font-medium text-gray-400">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Day Grid */}
                    <div className="grid grid-cols-7">
                        {/* Empty cells before first day */}
                        {Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-8" />
                        ))}
                        {/* Day cells */}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                            <button
                                key={day}
                                type="button"
                                onClick={() => selectDay(day)}
                                className={cn(
                                    "flex h-8 w-full items-center justify-center rounded-md text-sm transition-colors",
                                    "hover:bg-gray-100",
                                    isSelected(day) && "bg-gray-900 text-white hover:bg-gray-800",
                                    isToday(day) && !isSelected(day) && "bg-gray-100 font-semibold",
                                    !isSelected(day) && "text-gray-700"
                                )}
                            >
                                {day}
                            </button>
                        ))}
                    </div>

                    {/* Today shortcut */}
                    <div className="mt-2 pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => {
                                onChange(formatDate(today));
                                setOpen(false);
                            }}
                            className="w-full text-xs text-center text-gray-500 hover:text-gray-800 py-1 transition-colors"
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
