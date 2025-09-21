"use client";

import React, { useMemo, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { filterUpcomingTargets, UpcomingTarget } from "@/lib/data-processing";
import { useAllHistoryData } from "@/lib/hooks/useHistoryData";

interface UpcomingTargetsProps {
  localData?: unknown; // Keep for backward compatibility but make optional
  dashboardData?: unknown; // Keep for backward compatibility but make optional
  isScanning?: boolean;
}

const UpcomingTargets = React.memo<UpcomingTargetsProps>(({ localData, dashboardData, isScanning }) => {
  // Fetch aggregated data from all missions like history page
  const { data: allHistoryData } = useAllHistoryData();
  
  try {
    // Create comprehensive data object using aggregated history data (MISSION_DATA_ANALYSIS approach)
    const comprehensiveData = useMemo(() => {
      if (allHistoryData) {
        return {
          quizzes: allHistoryData.quizzes || [],
          assignments: allHistoryData.assignments || [],
          courses: allHistoryData.courses || [],
          absences: allHistoryData.absences || []
        };
      }
      // Fallback to local data if history data isn't available yet
      return localData;
    }, [allHistoryData, localData]);

    // Use the utility function to filter upcoming targets (7-day lookahead) 
    // Pass parameters in correct order: (localData, dashboardData, daysAhead)
    const upcomingTargets = useMemo(() => {
      // Prioritize dashboard data for most recent information  
      const dataToUse = (dashboardData as any)?.last_scrape ? null : comprehensiveData;
      return filterUpcomingTargets(dataToUse, dashboardData, 7);
    }, [comprehensiveData, dashboardData]);

    // Memoize helper functions to prevent recreation on every render
    const getTypeIcon = useCallback((type: string) => {
      return type === 'quiz' ? 'Q' : 'A';
    }, []);

    const getUrgencyColor = useCallback((closedAt?: string) => {
      if (!closedAt) return 'text-text-secondary';
      
      const now = new Date();
      const deadline = new Date(closedAt);
      const diffMs = deadline.getTime() - now.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      if (diffMs <= oneDayMs) return 'text-state-error';
      if (diffMs <= 2 * oneDayMs) return 'text-state-warning';
      return 'text-state-success';
    }, []);

    // Keyboard navigation handler
    const handleKeyDown = useCallback((event: React.KeyboardEvent, target: UpcomingTarget) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        // Could trigger target details or navigation
        console.log('Target selected:', target.name);
      }
    }, []);

  return (
    <Card 
      className={`relative overflow-hidden h-full ${isScanning ? 'animate-pulse' : ''}`}
      role="region"
      aria-label="Upcoming assignments and quizzes"
    >
      {/* Corner brackets - decorative only, hidden from screen readers */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-accent-primary opacity-30" aria-hidden="true"></div>
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-accent-primary opacity-30" aria-hidden="true"></div>
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-accent-primary opacity-30" aria-hidden="true"></div>
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-accent-primary opacity-30" aria-hidden="true"></div>
      
      <div className="p-4 h-full flex flex-col">
        <header className="flex items-center justify-between mb-4">
          <h3 
            className="font-heading text-base md:text-lg text-accent-primary animate-flicker"
            style={{ textShadow: '0 0 5px rgba(137, 221, 255, 0.6)' }}
            id="upcoming-targets-title"
          >
            {"// UPCOMING TARGETS"}
          </h3>
          <Link 
            href="/history" 
            className="text-xs text-accent-primary hover:text-text-heading transition-colors font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-primary rounded px-1"
            aria-label="View all upcoming targets in history page"
          >
            [VIEW_ALL]
          </Link>
        </header>
        
        <main className="flex-1" aria-labelledby="upcoming-targets-title">
          {upcomingTargets.length === 0 ? (
            <div 
              className="flex items-center justify-center h-full"
              role="status"
              aria-live="polite"
            >
              <div className="text-center">
                <div className="font-mono text-4xl text-text-secondary mb-2 opacity-50" aria-hidden="true">*</div>
                <p className="text-text-secondary text-sm font-mono">
                  NO IMMEDIATE TARGETS
                </p>
                <p className="text-text-secondary text-xs font-mono mt-1 opacity-70">
                  Next 7 days are clear
                </p>
              </div>
            </div>
          ) : (
            <div 
              className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-accent-primary scrollbar-track-background-secondary"
              role="list"
              aria-label={`${upcomingTargets.length} upcoming targets`}
              aria-live="polite"
            >
              {upcomingTargets.map((target, index) => (
                <article 
                  key={`${target.type}-${target.name}-${index}`}
                  className="flex items-start gap-3 p-3 bg-background-secondary/30 border border-state-disabled/30 rounded hover:border-accent-primary/30 transition-colors focus-within:border-accent-primary/50"
                  role="listitem"
                  tabIndex={0}
                  onKeyDown={(e) => handleKeyDown(e, target)}
                  aria-label={`${target.type}: ${target.name} in ${target.course}, due ${target.timeRemaining}, urgency level ${target.urgencyLevel}`}
                >
                  <div 
                    className="text-lg mt-0.5 font-mono font-bold text-accent-primary"
                    aria-label={`${target.type} icon`}
                    role="img"
                  >
                    {getTypeIcon(target.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className={`font-mono text-xs font-bold ${getUrgencyColor(target.dueDate)}`}
                        aria-label={`Type: ${target.type}, urgency: ${target.urgencyLevel}`}
                      >
                        {target.type.toUpperCase()}:
                      </span>
                      <span className={`font-mono text-sm font-bold ${getUrgencyColor(target.dueDate)}`}>
                        {target.timeRemaining}
                      </span>
                    </div>
                    <h4 className="font-mono text-sm text-text-primary truncate">
                      {target.name}
                    </h4>
                    <p className="font-mono text-xs text-text-secondary truncate mt-1">
                      Course: {target.course}
                    </p>
                    {target.dueDate && (
                      <p className="font-mono text-xs text-accent-primary truncate mt-1">
                        Due: {target.dueDate}
                      </p>
                    )}
                  </div>
                </article>
              ))}
              
              {upcomingTargets.length >= 3 && (
                <div className="text-center py-2 border-t border-state-disabled/20 mt-3 pt-3">
                  <p className="text-text-secondary text-xs font-mono opacity-50" aria-live="polite">
                    Scroll for more entries ({upcomingTargets.length} total)
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
        
        {/* Status indicator */}
        <footer className="mt-4 pt-3 border-t border-state-disabled/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary font-mono">
              TARGET_SCANNER:
            </span>
            <span 
              className="text-xs text-state-success font-mono animate-pulse"
              role="status"
              aria-live="polite"
              aria-label="Target scanner status: tracking"
            >
              TRACKING
            </span>
          </div>
        </footer>
      </div>
    </Card>
  );
  } catch (error) {
    console.error('UpcomingTargets component error:', error);
    return (
      <Card className="relative overflow-hidden h-full">
        <div className="p-4 h-full flex items-center justify-center">
          <div className="text-center">
            <div className="font-mono text-4xl text-state-error mb-2">!</div>
            <p className="text-state-error text-sm font-mono">COMPONENT ERROR</p>
            <p className="text-text-secondary text-xs font-mono mt-1">Check console for details</p>
          </div>
        </div>
      </Card>
    );
  }
});

UpcomingTargets.displayName = 'UpcomingTargets';

export default UpcomingTargets;