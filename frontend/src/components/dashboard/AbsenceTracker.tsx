"use client";

import React, { useMemo, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { useAllHistoryData } from "@/lib/hooks/useHistoryData";

interface AbsenceTrackerProps {
  absences?: any[]; // Keep for backward compatibility but make optional
  isScanning?: boolean;
}

const AbsenceTracker = React.memo<AbsenceTrackerProps>(({ absences = [], isScanning }) => {
  // Fetch aggregated data from all missions like history page
  const { data: allHistoryData, isLoading: historyLoading } = useAllHistoryData();

  try {
    // Get absences from aggregated history data (all missions) instead of just local data
    const allAbsences = useMemo(() => {
      // Use aggregated absences from all successful scrapes (MISSION_DATA_ANALYSIS approach)
      if (allHistoryData && allHistoryData.absences) {
        return allHistoryData.absences;
      }
      // Fallback to local absences if history data isn't available yet
      return absences || [];
    }, [allHistoryData, absences]);

    // Validate input data
    if (!Array.isArray(allAbsences)) {
      console.warn('AbsenceTracker: absences data is not an array:', typeof allAbsences);
      return (
        <Card className="relative overflow-hidden h-full">
          <div className="p-4 h-full flex items-center justify-center">
            <div className="text-center">
              <div className="font-mono text-4xl text-state-error mb-2">!</div>
              <p className="text-state-error text-sm font-mono">DATA FORMAT ERROR</p>
            </div>
          </div>
        </Card>
      );
    }

    // Helper function to parse dates in various formats
    const parseAbsenceDate = (dateString: string): Date | null => {
      if (!dateString) return null;

      try {
        // Handle format like "Fri, 18/07/2025"
        if (dateString.includes(',') && dateString.includes('/')) {
          const parts = dateString.split(', ')[1]?.split('/');
          if (parts && parts.length === 3) {
            const day = parts[0];
            const month = parts[1];
            const year = parts[2];
            // Create a proper date string: MM/DD/YYYY
            const properDateString = `${month}/${day}/${year}`;
            const date = new Date(properDateString);
            if (!isNaN(date.getTime())) return date;
          }
        }

        // Try standard date parsing
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) return date;

        return null;
      } catch (error) {
        return null;
      }
    };

    // Memoize sorted absences to prevent unnecessary recalculations
    const sortedAbsences = useMemo(() => {
      return allAbsences
        ?.slice()
        .filter(absence => absence && absence.date) // Filter out invalid entries
        .sort((a, b) => {
          try {
            const dateA = parseAbsenceDate(a.date);
            const dateB = parseAbsenceDate(b.date);

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1; // Put invalid dates at the end
            if (!dateB) return -1; // Put invalid dates at the end

            return dateB.getTime() - dateA.getTime();
          } catch (error) {
            console.error('Error sorting absences:', error);
            return 0;
          }
        })
        .slice(0, 5) || []; // Show top 5 most recent
    }, [allAbsences]);

    // Memoize helper functions to prevent recreation on every render
    const formatDate = useCallback((dateString: string): string => {
      if (!dateString) return 'Unknown';

      try {
        // Handle format like "Fri, 18/07/2025"
        if (dateString.includes(',') && dateString.includes('/')) {
          const parts = dateString.split(', ')[1]?.split('/');
          if (parts && parts.length === 3) {
            const day = parts[0];
            const month = parts[1];
            const year = parts[2];
            // Create a proper date string: MM/DD/YYYY
            const properDateString = `${month}/${day}/${year}`;
            const date = new Date(properDateString);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
              });
            }
          }
        }

        // Try standard date parsing
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
          });
        }

        // Return the original if parsing fails
        return dateString;
      } catch (error) {
        console.warn('Date formatting error:', error, 'for date:', dateString);
        return dateString;
      }
    }, []);

    const getAbsenceIcon = useCallback((type?: string) => {
      switch (type?.toLowerCase()) {
        case 'lecture': return 'L';
        case 'practical': return 'P';
        case 'excused': return 'E';
        case 'unexcused': return 'U';
        case 'late': return 'T';
        default: return '!';
      }
    }, []);

    const getAbsenceColor = useCallback((type?: string) => {
      switch (type?.toLowerCase()) {
        case 'lecture': return 'text-state-error';
        case 'practical': return 'text-state-warning';
        case 'excused': return 'text-state-success';
        case 'unexcused': return 'text-state-error';
        case 'late': return 'text-state-warning';
        default: return 'text-state-warning';
      }
    }, []);

    // Keyboard navigation handler
    const handleKeyDown = useCallback((event: React.KeyboardEvent, absence: any) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        // Could trigger absence details or navigation
        console.log('Absence selected:', absence.course, absence.date);
      }
    }, []);

    return (
      <Card
        className={`relative overflow-hidden h-full ${isScanning ? 'animate-pulse' : ''}`}
        role="region"
        aria-label="Absence tracking information"
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
              id="absence-tracker-title"
            >
            // ABSENCE TRACKER
            </h3>
            <Link
              href="/history"
              className="text-xs text-accent-primary hover:text-text-heading transition-colors font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-primary rounded px-1"
              aria-label="View all absences in history page"
            >
              [VIEW_ALL]
            </Link>
          </header>

          <main className="flex-1" aria-labelledby="absence-tracker-title">
            {sortedAbsences.length === 0 ? (
              <div
                className="flex items-center justify-center h-full"
                role="status"
                aria-live="polite"
              >
                <div className="text-center">
                  <div className="font-mono text-4xl text-text-secondary mb-2 opacity-50" aria-hidden="true">OK</div>
                  <p className="text-text-secondary text-sm font-mono">
                    NO ABSENCES DETECTED
                  </p>
                  <p className="text-text-secondary text-xs font-mono mt-1 opacity-70">
                    System is clear
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-accent-primary scrollbar-track-background-secondary"
                role="list"
                aria-label={`${sortedAbsences.length} recorded absences`}
                aria-live="polite"
              >
                {sortedAbsences.map((absence, index) => (
                  <article
                    key={`${absence.course}-${absence.date}-${index}`}
                    className="flex items-start gap-3 p-3 bg-background-secondary/30 border border-state-disabled/30 rounded hover:border-accent-primary/30 transition-colors focus-within:border-accent-primary/50"
                    role="listitem"
                    tabIndex={0}
                    onKeyDown={(e) => handleKeyDown(e, absence)}
                    aria-label={`${absence.type || 'Absence'} in ${absence.course} on ${formatDate(absence.date)}, status: ${absence.status || 'Recorded'}`}
                  >
                    <div
                      className="text-lg mt-0.5 font-mono font-bold text-accent-primary"
                      aria-label={`${absence.type || 'absence'} type indicator`}
                      role="img"
                    >
                      {getAbsenceIcon(absence.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`font-mono text-xs font-bold ${getAbsenceColor(absence.type)}`}
                          aria-label={`Type: ${absence.type || 'absence'}`}
                        >
                          {absence.type?.toUpperCase() || 'ABSENCE'}:
                        </span>
                        <span
                          className="font-mono text-xs text-text-secondary"
                          aria-label={`Date: ${formatDate(absence.date)}`}
                        >
                          {formatDate(absence.date) || 'Unknown Date'}
                        </span>
                      </div>
                      <h4 className="font-mono text-sm text-text-primary truncate">
                        {absence.course}
                      </h4>
                      <p className="font-mono text-xs text-accent-primary truncate mt-1">
                        Status: {absence.status || 'Recorded'}
                      </p>
                      {absence.reason && (
                        <p className="font-mono text-xs text-text-secondary truncate mt-1">
                          Reason: {absence.reason}
                        </p>
                      )}
                    </div>
                  </article>
                ))}

                {sortedAbsences.length >= 3 && (
                  <div className="text-center py-2 border-t border-state-disabled/20 mt-3 pt-3">
                    <p className="text-text-secondary text-xs font-mono opacity-50" aria-live="polite">
                      Scroll for more entries ({sortedAbsences.length} total)
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
                ATTENDANCE_MONITOR:
              </span>
              <span
                className={`text-xs font-mono animate-pulse ${sortedAbsences.length > 0 ? 'text-state-warning' : 'text-state-success'
                  }`}
                role="status"
                aria-live="polite"
                aria-label={`Attendance monitor status: ${sortedAbsences.length > 0 ? 'tracking absences' : 'clear'}`}
              >
                {sortedAbsences.length > 0 ? 'TRACKING' : 'CLEAR'}
              </span>
            </div>
          </footer>
        </div>
      </Card>
    );
  } catch (error) {
    console.error('AbsenceTracker component error:', error);
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

AbsenceTracker.displayName = 'AbsenceTracker';

export default AbsenceTracker;