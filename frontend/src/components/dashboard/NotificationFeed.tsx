"use client";

import React, { useMemo, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { ProcessedNotification, transformScrapedDataToNotifications } from "@/lib/data-processing";
import { useAllHistoryData } from "@/lib/hooks/useHistoryData";

interface NotificationFeedProps {
  localData?: any; // Keep for backward compatibility but make optional
  dashboardData?: any; // Keep for backward compatibility but make optional
  isScanning?: boolean;
}

const NotificationFeed = React.memo<NotificationFeedProps>(({ localData, dashboardData, isScanning }) => {
  // Fetch aggregated data from all missions like history page
  const { data: allHistoryData, isLoading: historyLoading } = useAllHistoryData();
  
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

  // Memoize expensive data transformation to prevent unnecessary recalculations
  const notifications = useMemo(() => {
    // Prioritize dashboard data for most recent information
    const dataToUse = dashboardData?.last_scrape ? null : comprehensiveData;
    return transformScrapedDataToNotifications(dataToUse, dashboardData);
  }, [comprehensiveData, dashboardData]);
  
  // Memoize sorted and sliced notifications
  const sortedNotifications = useMemo(() => {
    return notifications.slice(0, 15); // Show top 15 most recent for scrolling
  }, [notifications]);

  // Memoize helper functions to prevent recreation on every render
  const getIcon = useCallback((type: string) => {
    switch (type) {
      case 'assignment': return 'A';
      case 'grade': return 'G';
      case 'quiz': return 'Q';
      case 'absence': return '!';
      case 'course': return 'C';
      default: return '?';
    }
  }, []);

  const getTypeLabel = useCallback((type: string) => {
    switch (type) {
      case 'assignment': return 'NEW ASSIGNMENT';
      case 'grade': return 'NEW GRADE';
      case 'quiz': return 'NEW QUIZ';
      case 'absence': return 'ABSENCE RECORDED';
      case 'course': return 'NEW COURSE';
      default: return 'UPDATE';
    }
  }, []);

  const getPriorityColor = useCallback((priority?: string) => {
    switch (priority) {
      case 'high': return 'text-state-error';
      case 'medium': return 'text-state-warning';
      case 'low': return 'text-state-success';
      default: return 'text-accent-primary';
    }
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent, notification: ProcessedNotification) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // Could trigger notification details or navigation
      console.log('Notification selected:', notification.title);
    }
  }, []);

  return (
    <Card 
      className={`relative overflow-hidden h-full ${isScanning ? 'animate-pulse' : ''}`}
      role="region"
      aria-label="Academic notifications feed"
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
            id="hunt-feed-title"
          >
            // HUNT FEED
          </h3>
          <Link 
            href="/history" 
            className="text-xs text-accent-primary hover:text-text-heading transition-colors font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-primary rounded px-1"
            aria-label="View all notifications in history page"
          >
            [VIEW_ALL]
          </Link>
        </header>
        
        <main className="flex-1 overflow-hidden" aria-labelledby="hunt-feed-title">
          {sortedNotifications.length === 0 ? (
            <div 
              className="flex items-center justify-center h-full"
              role="status"
              aria-live="polite"
            >
              <div className="text-center">
                <div className="font-mono text-4xl text-text-secondary mb-2 opacity-50" aria-hidden="true">&gt;</div>
                <p className="text-text-secondary text-sm font-mono">
                  NO NEW TARGETS DETECTED
                </p>
                <p className="text-text-secondary text-xs font-mono mt-1 opacity-70">
                  System is actively monitoring for updates
                </p>
              </div>
            </div>
          ) : (
            <div 
              className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-accent-primary scrollbar-track-background-secondary"
              role="feed"
              aria-label={`${sortedNotifications.length} academic notifications`}
              aria-live="polite"
            >
              {sortedNotifications.map((notification, index) => (
                <article 
                  key={`${notification.type}-${notification.title}-${index}`}
                  className="flex items-start gap-3 p-3 bg-background-secondary/30 border border-state-disabled/30 rounded hover:border-accent-primary/30 transition-colors focus-within:border-accent-primary/50"
                  role="article"
                  tabIndex={0}
                  onKeyDown={(e) => handleKeyDown(e, notification)}
                  aria-label={`${getTypeLabel(notification.type)}: ${notification.title} ${notification.course ? `in ${notification.course}` : ''}`}
                >
                  <div 
                    className="text-lg mt-0.5 font-mono font-bold text-accent-primary"
                    aria-label={`${notification.type} notification`}
                    role="img"
                  >
                    {getIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className={`font-mono text-xs font-bold ${getPriorityColor(notification.priority)}`}
                        aria-label={`Priority: ${notification.priority || 'normal'}`}
                      >
                        {getTypeLabel(notification.type)}:
                      </span>
                    </div>
                    <h4 className="font-mono text-sm text-text-primary truncate">
                      {notification.title}
                    </h4>
                    {notification.course && (
                      <p className="font-mono text-xs text-text-secondary truncate mt-1">
                        Course: {notification.course}
                      </p>
                    )}
                    {notification.details && (
                      <p className="font-mono text-xs text-accent-primary truncate mt-1">
                        {notification.details}
                      </p>
                    )}
                  </div>
                </article>
              ))}
              
              {sortedNotifications.length >= 10 && (
                <div className="text-center py-2 border-t border-state-disabled/20 mt-3 pt-3">
                  <p className="text-text-secondary text-xs font-mono opacity-50" aria-live="polite">
                    Scroll for more entries ({sortedNotifications.length} total)
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
              HUNT_MONITOR:
            </span>
            <span 
              className="text-xs text-state-success font-mono animate-pulse"
              role="status"
              aria-live="polite"
              aria-label="Hunt monitor status: active"
            >
              ACTIVE
            </span>
          </div>
        </footer>
      </div>
    </Card>
  );
});

NotificationFeed.displayName = 'NotificationFeed';

export default NotificationFeed;