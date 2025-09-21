// /frontend/src/app/(app)/history/page.tsx
"use client";

import { useState } from 'react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LifetimeArchiveStats from "@/components/history/LifetimeArchiveStats";
import DataAccordionView from "@/components/history/DataAccordionView";
import ScrapeHistoryLog from "@/components/history/ScrapeHistoryLog";
import { useUserSpecificLocalStorage } from "@/lib/hooks/useUserSpecificLocalStorage";
import { useAllHistoryData } from "@/lib/hooks/useHistoryData";

const queryClient = new QueryClient();

function HistoryView() {
    const [selectedScrapeData, setSelectedScrapeData] = useState<any>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [showingCachedData, setShowingCachedData] = useState(true);
    
    // Ensure user-specific localStorage
    useUserSpecificLocalStorage();
    
    // Get cached data as default
    const { data: allData } = useAllHistoryData();

    // Set cached data as default on component mount
    React.useEffect(() => {
        if (allData && showingCachedData) {
            console.log('All data structure:', allData); // Debug log
            setSelectedScrapeData({
                quizzes: {
                    courses_found_on_page: allData.courses || [],
                    quizzes_with_results: allData.quizzes || [],
                    quizzes_without_results: []
                },
                assignments: {
                    courses_found_on_page: allData.courses || [],
                    assignments: allData.assignments || []
                },
                absences: {
                    absences: allData.absences || []
                }
            });
        }
    }, [allData, showingCachedData]);

    const handleViewDetails = async (scrapeId: string, scrapeData: any) => {
        setIsLoadingDetails(true);
        setShowingCachedData(false);
        setSelectedScrapeData(scrapeData);
        setIsLoadingDetails(false);
    };

    return (
        <div className="min-h-screen grid-background relative">
            {/* Scanline overlay */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'linear-gradient(rgba(18, 18, 18, 0.5) 50%, rgba(0, 0, 0, 0.25) 50%)',
                    backgroundSize: '100% 4px'
                }}
            />
            
            <div className="relative z-10 p-4 md:p-6">
                {/* Enhanced Header */}
                <div className="mb-4 md:mb-6 lg:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 md:mb-4 gap-1 md:gap-2">
                        <h1 className="font-heading text-lg md:text-xl lg:text-2xl xl:text-3xl text-text-heading"
                            style={{ textShadow: '0 0 8px rgba(255, 255, 255, 0.3)' }}>
                            // MISSION ARCHIVE DATABASE
                        </h1>
                        <div className="font-body text-xs text-accent-primary">
                            [HISTORICAL_DATA_STREAM]
                        </div>
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-accent-primary to-transparent opacity-50"></div>
                </div>
                
                {/* Lifetime Archive Statistics */}
                <LifetimeArchiveStats />
                
                {/* Data Accordion View */}
                <DataAccordionView 
                    selectedScrapeData={selectedScrapeData}
                    isLoading={isLoadingDetails}
                    showingCachedData={showingCachedData}
                />
                
                {/* Scrape History Log */}
                <ScrapeHistoryLog onViewDetails={handleViewDetails} />
            </div>
        </div>
    );
}


export default function HistoryPage() {
    return (
        <QueryClientProvider client={queryClient}>
            <HistoryView />
        </QueryClientProvider>
    );
}