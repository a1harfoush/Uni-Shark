// /frontend/src/components/dashboard/LocalDataArchive.tsx
"use client";

import React, { useMemo, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { useHistoryStats, useAllHistoryData, useHistoryList } from "@/lib/hooks/useHistoryData";
import TestimonialButton from "@/components/ui/TestimonialButton";

interface LocalDataArchiveProps {
    localData?: any;
    dashboardData?: any;
    isScanning?: boolean;
}

const LocalDataArchive = React.memo<LocalDataArchiveProps>(({
    localData,
    dashboardData,
    isScanning
}) => {

    // Fetch data from API instead of using local calculations
    const { data: historyStats, isLoading: statsLoading } = useHistoryStats();
    const { data: allHistoryData, isLoading: dataLoading } = useAllHistoryData();
    const { data: historyList, isLoading: listLoading } = useHistoryList();

    // Memoize helper functions to prevent recreation on every render
    const formatLastUpdated = useCallback((dateStr?: string) => {
        if (!dateStr) return "NEVER";
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMinutes < 1) return "NOW";
            if (diffMinutes < 60) return `${diffMinutes}M_AGO`;
            if (diffHours < 24) return `${diffHours}H_AGO`;
            if (diffDays < 7) return `${diffDays}D_AGO`;

            // For longer periods, use a more readable format
            if (diffDays < 30) return `${Math.floor(diffDays / 7)}W_AGO`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)}M_AGO`;
            return `${Math.floor(diffDays / 365)}Y_AGO`;
        } catch {
            return "UNKNOWN";
        }
    }, []);

    const getOperationalStatusColor = useCallback((status: string) => {
        switch (status) {
            case 'operational': return 'text-state-success';
            case 'warning': return 'text-state-warning';
            case 'error': return 'text-state-error';
            default: return 'text-state-success';
        }
    }, []);

    // Calculate stats from API data
    const stats = useMemo(() => {
        // Use dashboard stats for scrape counts (more reliable than historyList)
        const totalScrapes = dashboardData?.stats?.total_scrapes || historyList?.length || 0;
        const successfulScrapes = dashboardData?.stats?.successful_scrapes || historyList?.filter(item => item.status === 'success')?.length || 0;
        const dataIntegrity = totalScrapes > 0 ? Math.round((successfulScrapes / totalScrapes) * 100) : 100;

        // More reasonable thresholds for operational status
        let operationalStatus: 'operational' | 'warning' | 'error' = 'operational';
        if (dataIntegrity < 50) operationalStatus = 'error';
        else if (dataIntegrity < 75) operationalStatus = 'warning';

        // If we have recent successful scrapes, prioritize that over historical data
        const recentScrapes = historyList?.slice(0, 10) || []; // Last 10 scrapes
        const recentSuccessRate = recentScrapes.length > 0
            ? (recentScrapes.filter(s => s.status === 'success').length / recentScrapes.length) * 100
            : dataIntegrity;

        // Override status based on recent performance
        if (recentSuccessRate >= 80) operationalStatus = 'operational';
        else if (recentSuccessRate >= 60) operationalStatus = 'warning';
        else operationalStatus = 'error';

        // Get the last scrape date from MISSION_LOG_ARCHIVE (historyList) instead of dashboard data
        const lastScrapedAt = historyList && historyList.length > 0
            ? historyList[0].scraped_at  // Most recent scrape from history
            : dashboardData?.last_scrape?.scraped_at || new Date().toISOString();

        return {
            totalCourses: historyStats?.total_courses || 0,
            totalQuizzes: historyStats?.total_quizzes || 0,
            totalAssignments: historyStats?.total_assignments || 0,
            totalScrapes,
            successfulScrapes,
            lastUpdated: lastScrapedAt,
            dataIntegrity,
            operationalStatus
        };
    }, [historyStats, allHistoryData, dashboardData, historyList]);

    const isLoading = statsLoading || dataLoading || listLoading;

    return (
        <Card
            className={`relative overflow-hidden md:col-span-12 ${isScanning ? 'animate-pulse' : ''}`}
            role="region"
            aria-label="Local data archive statistics and integrity information"
        >
            {/* Corner brackets - decorative only, hidden from screen readers */}
            <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-accent-primary opacity-30" aria-hidden="true"></div>
            <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-accent-primary opacity-30" aria-hidden="true"></div>
            <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-accent-primary opacity-30" aria-hidden="true"></div>
            <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-accent-primary opacity-30" aria-hidden="true"></div>

            <div className="p-6">
                <header className="flex items-center justify-between mb-6">
                    <h2
                        className="font-heading text-xl text-accent-primary animate-flicker"
                        style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}
                        id="local-data-archive-title"
                    >
                        Local Data Archive
                    </h2>
                    <Link
                        href="/history"
                        className="text-sm text-accent-primary hover:text-text-heading transition-colors font-mono group focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-primary rounded px-1"
                        aria-label="View full archive in history page"
                    >
                        <span className="group-hover:animate-pulse">[FULL_ARCHIVE]</span>
                    </Link>
                </header>

                <main aria-labelledby="local-data-archive-title">
                    {/* Stats Grid */}
                    <section
                        className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6"
                        role="group"
                        aria-label="Data statistics overview"
                    >
                        <div className="text-center" role="group" aria-label={`${stats.totalCourses} courses tracked`}>
                            <div
                                className="font-mono text-2xl text-accent-primary font-bold"
                                aria-label={`${stats.totalCourses} courses`}
                            >
                                {isLoading ? '...' : stats.totalCourses}
                            </div>
                            <div className="text-xs text-text-secondary font-mono">
                                COURSES_TRACKED
                            </div>
                        </div>

                        <div className="text-center" role="group" aria-label={`${stats.totalQuizzes} quizzes found`}>
                            <div
                                className="font-mono text-2xl text-accent-primary font-bold"
                                aria-label={`${stats.totalQuizzes} quizzes`}
                            >
                                {isLoading ? '...' : stats.totalQuizzes}
                            </div>
                            <div className="text-xs text-text-secondary font-mono">
                                QUIZZES_FOUND
                            </div>
                        </div>

                        <div className="text-center" role="group" aria-label={`${stats.totalAssignments} assignments found`}>
                            <div
                                className="font-mono text-2xl text-accent-primary font-bold"
                                aria-label={`${stats.totalAssignments} assignments`}
                            >
                                {isLoading ? '...' : stats.totalAssignments}
                            </div>
                            <div className="text-xs text-text-secondary font-mono">
                                ASSIGNMENTS_FOUND
                            </div>
                        </div>

                        <div className="text-center" role="group" aria-label={`${stats.totalScrapes} total scrapes performed`}>
                            <div
                                className="font-mono text-2xl text-accent-primary font-bold"
                                aria-label={`${stats.totalScrapes} scrapes`}
                            >
                                {isLoading ? '...' : stats.totalScrapes}
                            </div>
                            <div className="text-xs text-text-secondary font-mono">
                                TOTAL_SCRAPES
                            </div>
                        </div>

                        <div className="text-center" role="group" aria-label={`Last updated ${formatLastUpdated(stats.lastUpdated)}`}>
                            <div
                                className="font-mono text-2xl text-state-success font-bold"
                                aria-label={`Last updated: ${formatLastUpdated(stats.lastUpdated)}`}
                            >
                                {formatLastUpdated(stats.lastUpdated)}
                            </div>
                            <div className="text-xs text-text-secondary font-mono">
                                LAST_UPDATED
                            </div>
                        </div>

                        <div className="text-center" role="group" aria-label={`System status: ${stats.operationalStatus}`}>
                            <div
                                className={`font-mono text-2xl font-bold ${getOperationalStatusColor(stats.operationalStatus)}`}
                                aria-label={`Status: ${stats.operationalStatus}`}
                            >
                                {stats.operationalStatus.toUpperCase()}
                            </div>
                            <div className="text-xs text-text-secondary font-mono">
                                STATUS
                            </div>
                        </div>
                    </section>

                    {/* Data Integrity */}
                    <section
                        className="space-y-3"
                        role="group"
                        aria-label="Data integrity information"
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-sm text-text-primary">
                                <span className="text-accent-primary" aria-hidden="true">{'>'}</span> DATA_INTEGRITY
                            </span>
                            <span
                                className="font-mono text-sm text-accent-primary"
                                aria-label={`Data integrity: ${stats.dataIntegrity} percent`}
                            >
                                {stats.dataIntegrity}%
                            </span>
                        </div>

                        <div
                            className="w-full bg-background-secondary border border-accent-primary/30 rounded h-2 overflow-hidden"
                            role="progressbar"
                            aria-valuenow={stats.dataIntegrity}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Data integrity: ${stats.dataIntegrity}%`}
                        >
                            <div
                                className="h-full bg-gradient-to-r from-accent-primary to-state-success transition-all duration-1000"
                                style={{
                                    width: `${stats.dataIntegrity}%`,
                                    boxShadow: '0 0 8px rgba(137, 221, 255, 0.4)'
                                }}
                            />
                        </div>

                        <div
                            className="text-xs text-text-secondary font-mono text-center"
                            aria-label={`${stats.successfulScrapes} out of ${stats.totalScrapes} successful operations`}
                        >
                            {isLoading ? '...' : `${stats.successfulScrapes}/${stats.totalScrapes} successful operations`}
                        </div>

                        {/* Testimonial Button - Show when system is performing well */}
                        {stats.operationalStatus === 'operational' && stats.totalScrapes > 0 && (
                            <div className="flex justify-center pt-4 border-t border-accent-primary/20">
                                <TestimonialButton 
                                    variant="secondary" 
                                    className="text-xs px-4 py-2"
                                />
                            </div>
                        )}
                    </section>
                </main>
            </div>
        </Card>
    );
});

LocalDataArchive.displayName = 'LocalDataArchive';

export default LocalDataArchive;