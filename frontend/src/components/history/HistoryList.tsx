// /frontend/src/components/history/HistoryList.tsx
"use client";

import { useHistoryList, HistoryItem } from "@/lib/hooks/useHistoryData";
import { useDashboard } from "@/lib/context/DashboardContext";

interface HistoryListProps {
    onViewDetails: (scrapeId: string) => void;
}

export default function HistoryList({ onViewDetails }: HistoryListProps) {
    const { data: history, isLoading, isError, error } = useHistoryList();
    const { isScanning } = useDashboard();

    if (isLoading) {
        return <p className="font-mono text-text-secondary animate-pulse">{'>'} Loading history...</p>;
    }

    if (isError) {
        return <p className="font-mono text-state-error">{'>'} Error loading history: {error.message}</p>;
    }

    if (!history || history.length === 0) {
        return <p className="font-mono text-text-secondary">{'>'} No scrape history found.</p>;
    }

    return (
        <div className="font-mono text-sm space-y-4">
            {isScanning && (
                <div className="p-3 rounded-md bg-background-secondary/50 border border-accent-primary/50 animate-pulse">
                    <div className="flex flex-wrap items-center gap-x-4">
                        <span className="text-text-secondary">[{new Date().toLocaleString()}]</span>
                        <span className="font-bold">--</span>
                        <span className="text-accent-primary">[IN PROGRESS...]</span>
                    </div>
                </div>
            )}
            {history.map((item: HistoryItem) => {
                const date = new Date(item.scraped_at).toLocaleString();
                const statusClass = item.status === 'success' ? 'text-state-success' : 'text-state-error';
                const statusText = item.status.toUpperCase();
                const logText = item.status === 'success' 
                    ? `Found ${item.new_items_found} new items.`
                    : `Status: FAILED`;

                return (
                    <div key={item.id} className="p-3 rounded-md bg-background-secondary/50 border border-state-disabled/50">
                        <div className="flex flex-wrap items-center gap-x-4">
                            <span className="text-text-secondary">[{date}]</span>
                            <span className="font-bold">--</span>
                            <span className={statusClass}>[{statusText}]</span>
                            <span className="font-bold">--</span>
                            <span>{logText}</span>
                            <button 
                                onClick={() => onViewDetails(item.id)}
                                className="text-accent-primary hover:underline focus:underline ml-auto"
                            >
                                {'>'} VIEW DETAILS
                            </button>
                        </div>
                        {item.status !== 'success' && item.log_message && (
                            <p className="text-xs text-state-error mt-2 ml-2 pl-4 border-l-2 border-state-error/50">
                                {item.log_message}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}