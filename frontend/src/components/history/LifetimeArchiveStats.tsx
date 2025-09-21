// /frontend/src/components/history/LifetimeArchiveStats.tsx
"use client";

import { Card } from "@/components/ui/Card";
import { useAllHistoryData, useHistoryStats, useHistoryList } from "@/lib/hooks/useHistoryData";

export default function LifetimeArchiveStats() {
    const { data: allData, isLoading: dataLoading } = useAllHistoryData();
    const { data: historyStats, isLoading: statsLoading } = useHistoryStats();
    const { data: historyList, isLoading: listLoading } = useHistoryList();
    
    const isLoading = dataLoading || statsLoading || listLoading;

    if (isLoading || !allData) {
        return (
            <Card className="p-4 md:p-6 mb-6 md:mb-8 relative overflow-hidden">
                {/* Corner brackets */}
                <div className="absolute top-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-t-2 border-accent-primary opacity-30"></div>
                <div className="absolute top-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-t-2 border-accent-primary opacity-30"></div>
                <div className="absolute bottom-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-b-2 border-accent-primary opacity-30"></div>
                <div className="absolute bottom-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-b-2 border-accent-primary opacity-30"></div>
                
                <div className="text-center animate-pulse">
                    <div className="h-4 md:h-6 bg-background-secondary rounded w-3/4 mx-auto mb-4"></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-16 md:h-20 bg-background-secondary rounded"></div>
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString();
        } catch {
            return 'Unknown';
        }
    };

    return (
        <Card className="p-4 md:p-6 mb-6 md:mb-8 relative overflow-hidden">
            {/* Corner brackets */}
            <div className="absolute top-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-t-2 border-accent-primary opacity-30"></div>
            <div className="absolute top-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-t-2 border-accent-primary opacity-30"></div>
            <div className="absolute bottom-2 left-2 w-3 h-3 md:w-4 md:h-4 border-l-2 border-b-2 border-accent-primary opacity-30"></div>
            <div className="absolute bottom-2 right-2 w-3 h-3 md:w-4 md:h-4 border-r-2 border-b-2 border-accent-primary opacity-30"></div>
            
            <h2 className="font-heading text-base md:text-lg lg:text-xl text-accent-primary mb-4 md:mb-6 text-center animate-flicker"
                style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}>
                {`> LIFETIME_ARCHIVE_STATISTICS`}
            </h2>
            
            {/* Summary Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
                <div className="p-4 bg-background-secondary/50 rounded border border-accent-primary/20 text-center">
                    <p className="font-mono text-3xl text-accent-primary animate-glowPulse"
                       style={{ textShadow: '0 0 8px rgba(137, 221, 255, 0.6)' }}>
                        {historyStats?.total_courses ?? 0}
                    </p>
                    <p className="text-xs text-text-secondary font-heading">TOTAL COURSES</p>
                </div>
                <div className="p-4 bg-background-secondary/50 rounded border border-accent-primary/20 text-center">
                    <p className="font-mono text-3xl text-accent-primary animate-glowPulse"
                       style={{ textShadow: '0 0 8px rgba(137, 221, 255, 0.6)' }}>
                        {historyStats?.total_quizzes ?? 0}
                    </p>
                    <p className="text-xs text-text-secondary font-heading">TOTAL QUIZZES</p>
                </div>
                <div className="p-4 bg-background-secondary/50 rounded border border-accent-primary/20 text-center">
                    <p className="font-mono text-3xl text-accent-primary animate-glowPulse"
                       style={{ textShadow: '0 0 8px rgba(137, 221, 255, 0.6)' }}>
                        {historyStats?.total_assignments ?? 0}
                    </p>
                    <p className="text-xs text-text-secondary font-heading">TOTAL ASSIGNMENTS</p>
                </div>
                <div className="p-4 bg-background-secondary/50 rounded border border-accent-primary/20 text-center">
                    <p className="font-mono text-3xl text-accent-primary animate-glowPulse"
                       style={{ textShadow: '0 0 8px rgba(137, 221, 255, 0.6)' }}>
                        {historyList?.length ?? 0}
                    </p>
                    <p className="text-xs text-text-secondary font-heading">TOTAL SCRAPES</p>
                </div>
            </div>

            {/* Last Updated Info */}
            <div className="text-center">
                <p className="font-mono text-xs text-text-secondary">
                    <span className="text-accent-primary">{'>'}</span> Archive contains all historical mission data
                </p>
            </div>
        </Card>
    );
}