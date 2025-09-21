// /frontend/src/components/history/ScrapeHistoryLog.tsx
"use client";

import { Card } from "@/components/ui/Card";
import { useHistoryList, HistoryItem } from "@/lib/hooks/useHistoryData";
import { useDashboard } from "@/lib/context/DashboardContext";
import { useAuth } from "@clerk/nextjs";

interface ScrapeHistoryLogProps {
    onViewDetails: (scrapeId: string, scrapeData: any) => void;
}

export default function ScrapeHistoryLog({ onViewDetails }: ScrapeHistoryLogProps) {
    const { data: history, isLoading, isError, error } = useHistoryList();
    const { isScanning } = useDashboard();
    const { getToken } = useAuth();

    if (isLoading) {
        return (
            <Card className="p-4 md:p-6">
                <h3 className="font-heading text-base md:text-lg text-accent-primary mb-4 animate-flicker"
                    style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
                    {`> MISSION_LOG_ARCHIVE`}
                </h3>
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-10 md:h-12 bg-background-secondary/50 rounded border border-accent-primary/10"></div>
                        </div>
                    ))}
                </div>
            </Card>
        );
    }

    if (isError) {
        return (
            <Card className="p-4 md:p-6">
                <h3 className="font-heading text-base md:text-lg text-accent-primary mb-4">
                    {`> MISSION_LOG_ARCHIVE`}
                </h3>
                <p className="font-mono text-state-error text-xs md:text-sm">
                    <span className="text-accent-primary">{'>'}</span> Error loading mission log: {error.message}
                </p>
            </Card>
        );
    }

    if (!history || history.length === 0) {
        return (
            <Card className="p-4 md:p-6">
                <h3 className="font-heading text-base md:text-lg text-accent-primary mb-4">
                    {`> MISSION_LOG_ARCHIVE`}
                </h3>
                <p className="font-mono text-text-secondary text-center py-6 md:py-8 text-xs md:text-sm">
                    <span className="text-accent-primary">{'>'}</span> No mission logs found. Execute your first scan to begin building the archive.
                </p>
            </Card>
        );
    }

    const handleViewDetails = async (item: HistoryItem) => {
        try {
            // Fetch the detailed data for this scrape
            const token = await getToken();
            const response = await fetch(`/api/history/${item.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch scrape details');
            }
            
            const data = await response.json();
            onViewDetails(item.id, data.scraped_data);
            
            // Smooth scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('Error fetching scrape details:', error);
        }
    };

    return (
        <Card className="p-4 md:p-6 relative overflow-hidden">
            {/* Corner brackets */}
            <div className="absolute top-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-t-2 border-accent-primary opacity-30"></div>
            <div className="absolute top-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-t-2 border-accent-primary opacity-30"></div>
            <div className="absolute bottom-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-b-2 border-accent-primary opacity-30"></div>
            <div className="absolute bottom-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-b-2 border-accent-primary opacity-30"></div>
            
            <h3 className="font-heading text-base md:text-lg text-accent-primary mb-4 md:mb-6 animate-flicker"
                style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
                {`> MISSION_LOG_ARCHIVE`}
            </h3>

            <div className="font-mono text-xs md:text-sm space-y-3 max-h-80 md:max-h-96 overflow-y-auto">
                {/* Current scan indicator */}
                {isScanning && (
                    <div className="p-4 rounded border border-accent-primary/50 bg-accent-primary/10 animate-pulse">
                        <div className="flex flex-wrap items-center gap-x-4">
                            <span className="text-text-secondary">[{new Date().toLocaleString()}]</span>
                            <span className="font-bold text-accent-primary">--</span>
                            <span className="text-accent-primary font-bold animate-flicker">[MISSION_IN_PROGRESS...]</span>
                            <span className="font-bold text-accent-primary">--</span>
                            <span className="text-text-primary">Scanning target systems...</span>
                        </div>
                    </div>
                )}

                {/* Historical logs */}
                {history.map((item: HistoryItem) => {
                    const date = new Date(item.scraped_at).toLocaleString();
                    const statusClass = item.status === 'success' ? 'text-state-success' : 'text-state-error';
                    const statusText = item.status === 'success' ? 'MISSION_SUCCESS' : 'MISSION_FAILED';
                    const logText = item.status === 'success' 
                        ? `Found ${item.new_items_found} new items.`
                        : `Mission terminated: ${item.log_message || 'Unknown error'}`;

                    return (
                        <div key={item.id} className="p-3 md:p-4 rounded border border-background-secondary/50 bg-background-secondary/20 hover:bg-background-secondary/40 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-x-4">
                                <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4">
                                    <span className="text-text-secondary text-xs">[{date}]</span>
                                    <span className="font-bold text-accent-primary hidden sm:inline">--</span>
                                    <span className={`font-bold ${statusClass} text-xs sm:text-sm`}>[{statusText}]</span>
                                    <span className="font-bold text-accent-primary hidden sm:inline">--</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                                    <span className="text-text-primary text-xs sm:text-sm flex-1">{logText}</span>
                                    {item.status === 'success' && (
                                        <button 
                                            onClick={() => handleViewDetails(item)}
                                            className="text-accent-primary hover:text-text-heading focus:text-text-heading transition-colors font-bold text-xs sm:text-sm group self-start sm:self-auto"
                                        >
                                            <span className="group-hover:animate-pulse">{'>'} VIEW_DETAILS</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            {item.status !== 'success' && item.log_message && (
                                <div className="mt-2 ml-4 pl-4 border-l-2 border-state-error/50">
                                    <p className="text-xs text-state-error">
                                        <span className="text-accent-primary">{'>'}</span> ERROR_LOG: {item.log_message}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}