// /frontend/src/app/(app)/dashboard/page.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDashboardData } from "@/lib/hooks/useDashboardData";
import { useLocalScrapeData } from "@/lib/hooks/useLocalScrapeData";
import { useUserSpecificLocalStorage } from "@/lib/hooks/useUserSpecificLocalStorage";
import { useHistoryStats, useAllHistoryData, useHistoryList } from "@/lib/hooks/useHistoryData";
import OnboardingPrompt from "@/components/dashboard/OnboardingPrompt";
import ScanProgress from "@/components/dashboard/ScanProgress";
import ManualScanButton from "@/components/dashboard/ManualScanButton";
import KPICard from "@/components/dashboard/KPICard";
import NotificationFeed from "@/components/dashboard/NotificationFeed";
import UpcomingTargets from "@/components/dashboard/UpcomingTargets";
import AbsenceTracker from "@/components/dashboard/AbsenceTracker";
import LocalDataArchive from "@/components/dashboard/LocalDataArchive";
import AutomationStatus from "@/components/dashboard/AutomationStatus";

import { useDashboard } from "@/lib/context/DashboardContext";
import { useEffect } from "react";
import { filterTargetsToday } from "@/lib/data-processing";
import { 
  DashboardErrorBoundary,
  KPIErrorBoundary,
  NotificationErrorBoundary,
  TargetsErrorBoundary,
  AbsenceErrorBoundary,
  ArchiveErrorBoundary,
  ScanErrorBoundary
} from "@/components/error-boundaries";



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

function DashboardView() {
  const { dashboardData, isLoading, isError, error, runManualScan, isScanning, scanLogs } = useDashboardData();
  const { setIsScanning } = useDashboard();
  
  // Ensure user-specific localStorage
  useUserSpecificLocalStorage();
  
  // Fetch history data similar to history page for consistency
  const { data: historyStats } = useHistoryStats();
  const { data: allHistoryData } = useAllHistoryData();
  const { data: historyList } = useHistoryList();
  
  // Integrate local storage with dashboard data
  const localData = useLocalScrapeData(dashboardData?.last_scrape);

  // Update the context when the scanning state changes
  useEffect(() => {
    setIsScanning(isScanning);
  }, [isScanning, setIsScanning]);

  if (isLoading) {
    return <p className="animate-pulse p-4">{'>'} Loading system data...</p>;
  }

  if (isError) {
    return <p className="text-state-error p-4">{'>'} Error loading dashboard: {error ? error.message : 'Unknown error'}</p>;
  }

  if (!dashboardData) {
    return <p className="text-text-secondary p-4">{'>'} No data available.</p>;
  }

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
              // SHARK COMMAND CENTER
            </h1>
            <div className="font-body text-xs text-accent-primary animate-pulse">
              [CORE_ACTIVE]
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-accent-primary to-transparent opacity-50"></div>
        </div>
      
      {!dashboardData.is_onboarded ? (
        <OnboardingPrompt />
      ) : (
        <div className="space-y-6">
          {/* Scan Progress - Top Priority */}
          <ScanErrorBoundary>
            {isScanning ? (
                <ScanProgress logs={scanLogs} />
            ) : (
                <ManualScanButton onClick={() => runManualScan()} />
            )}
          </ScanErrorBoundary>
          
          {/* KPI Cards - Key Metrics */}
          <KPIErrorBoundary>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard 
                title="TARGETS_TODAY" 
                value={filterTargetsToday(allHistoryData || localData, dashboardData)} 
                subtitle="DUE IN 24H"
                href="/history"
                priority={filterTargetsToday(allHistoryData || localData, dashboardData) > 0 ? "high" : "low"}
              />
              <KPICard 
                title="TOTAL_ABSENCES" 
                value={allHistoryData?.absences?.length || localData?.absences?.length || dashboardData.stats.new_absences || 0} 
                subtitle="DETECTED"
                href="/history"
                priority={(allHistoryData?.absences?.length || localData?.absences?.length || dashboardData.stats.new_absences || 0) > 3 ? "high" : "medium"}
              />
              <KPICard 
                title="TOTAL_SCRAPES" 
                value={dashboardData.stats.total_scrapes || 0} 
                subtitle={`${dashboardData.stats.successful_scrapes || 0} SUCCESSFUL`}
                href="/history"
                priority="low"
              />
              <AutomationStatus />
            </div>
          </KPIErrorBoundary>
          
          {/* Data Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <NotificationErrorBoundary>
              <NotificationFeed
                localData={localData}
                dashboardData={dashboardData}
                isScanning={isScanning}
              />
            </NotificationErrorBoundary>
            <TargetsErrorBoundary>
              <UpcomingTargets
                localData={localData}
                dashboardData={dashboardData}
                isScanning={isScanning}
              />
            </TargetsErrorBoundary>
            <div className="md:col-span-2 lg:col-span-1">
              <AbsenceErrorBoundary>
                <AbsenceTracker
                  absences={allHistoryData?.absences || localData?.absences || dashboardData?.last_scrape?.scraped_data?.absences?.absences || []}
                  isScanning={isScanning}
                />
              </AbsenceErrorBoundary>
            </div>
          </div>
          
          {/* Local Data Archive - Footer */}
          <ArchiveErrorBoundary>
            <LocalDataArchive 
              localData={localData}
              dashboardData={dashboardData}
              isScanning={isScanning}
            />
          </ArchiveErrorBoundary>
        </div>
      )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardErrorBoundary section="Dashboard" enableRecovery={true}>
        <DashboardView />
      </DashboardErrorBoundary>
    </QueryClientProvider>
  );
}
