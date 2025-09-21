// /frontend/src/lib/hooks/useTimestampManager.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { TimestampManager, TimestampData, TimeDisplayOptions, StalenessInfo } from '../timestamp-manager';

export interface UseTimestampManagerOptions {
  stalenessThreshold?: number;
  autoRefreshInterval?: number; // milliseconds
  persistKey?: string; // localStorage key for persistence
}

export interface TimestampManagerHook {
  timestampManager: TimestampManager;
  displayTime: string;
  stalenessInfo: StalenessInfo;
  isStale: boolean;
  updateTimestamp: (successful: boolean, operationTime?: Date) => void;
  getDisplayTime: (options?: TimeDisplayOptions) => string;
  reset: () => void;
  actualUpdateTime: Date | null;
  displayUpdateTime: Date | null;
  failedOperationCount: number;
}

/**
 * React hook for managing timestamps with automatic refresh and persistence
 * @param options - Configuration options
 * @returns Timestamp manager hook interface
 */
export function useTimestampManager(options: UseTimestampManagerOptions = {}): TimestampManagerHook {
  const {
    stalenessThreshold = 15,
    autoRefreshInterval = 30000, // 30 seconds
    persistKey
  } = options;

  const timestampManagerRef = useRef<TimestampManager | null>(null);
  const [displayTime, setDisplayTime] = useState<string>('Never updated');
  const [stalenessInfo, setStalenessInfo] = useState<StalenessInfo>({
    isStale: true,
    minutesSinceUpdate: 0,
    warningLevel: 'none',
    message: 'No updates recorded'
  });
  const [actualUpdateTime, setActualUpdateTime] = useState<Date | null>(null);
  const [displayUpdateTime, setDisplayUpdateTime] = useState<Date | null>(null);
  const [failedOperationCount, setFailedOperationCount] = useState<number>(0);

  // Initialize timestamp manager
  useEffect(() => {
    if (!timestampManagerRef.current) {
      timestampManagerRef.current = new TimestampManager(stalenessThreshold);

      // Load persisted state if available
      if (persistKey) {
        try {
          const persistedData = localStorage.getItem(persistKey);
          if (persistedData) {
            const data: TimestampData = JSON.parse(persistedData);
            timestampManagerRef.current.importState(data);
          }
        } catch (error) {
          console.warn('Failed to load persisted timestamp data:', error);
        }
      }

      // Update initial state
      updateDisplayState();
    }
  }, [stalenessThreshold, persistKey]);

  // Auto-refresh display time
  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      updateDisplayState();
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval]);

  // Update display state from timestamp manager
  const updateDisplayState = useCallback(() => {
    if (!timestampManagerRef.current) return;

    const manager = timestampManagerRef.current;
    setDisplayTime(manager.getDisplayTime());
    setStalenessInfo(manager.getStalenessInfo());
    setActualUpdateTime(manager.getActualUpdateTime());
    setDisplayUpdateTime(manager.getDisplayUpdateTime());
    setFailedOperationCount(manager.getFailedOperationCount());
  }, []);

  // Persist state to localStorage
  const persistState = useCallback(() => {
    if (!persistKey || !timestampManagerRef.current) return;

    try {
      const state = timestampManagerRef.current.exportState();
      localStorage.setItem(persistKey, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to persist timestamp data:', error);
    }
  }, [persistKey]);

  // Update timestamp
  const updateTimestamp = useCallback((successful: boolean, operationTime?: Date) => {
    if (!timestampManagerRef.current) return;

    timestampManagerRef.current.updateTimestamp(successful, operationTime);
    updateDisplayState();
    persistState();
  }, [updateDisplayState, persistState]);

  // Get display time with options
  const getDisplayTime = useCallback((options?: TimeDisplayOptions): string => {
    if (!timestampManagerRef.current) return 'Never updated';
    return timestampManagerRef.current.getDisplayTime(options);
  }, []);

  // Reset timestamp manager
  const reset = useCallback(() => {
    if (!timestampManagerRef.current) return;

    timestampManagerRef.current.reset();
    updateDisplayState();
    persistState();
  }, [updateDisplayState, persistState]);

  return {
    timestampManager: timestampManagerRef.current!,
    displayTime,
    stalenessInfo,
    isStale: stalenessInfo.isStale,
    updateTimestamp,
    getDisplayTime,
    reset,
    actualUpdateTime,
    displayUpdateTime,
    failedOperationCount
  };
}

/**
 * Hook for simple timestamp display without full management features
 * @param timestamp - Date object or ISO string
 * @param options - Display options
 * @returns Formatted timestamp string that updates automatically
 */
export function useTimestampDisplay(
  timestamp: Date | string | null,
  options: TimeDisplayOptions & { refreshInterval?: number } = {}
): string {
  const { refreshInterval = 30000, ...displayOptions } = options;
  const [displayTime, setDisplayTime] = useState<string>('Never updated');

  useEffect(() => {
    const updateDisplay = () => {
      if (!timestamp) {
        setDisplayTime('Never updated');
        return;
      }

      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      const manager = new TimestampManager();
      manager.updateTimestamp(true, date);
      setDisplayTime(manager.getDisplayTime(displayOptions));
    };

    // Initial update
    updateDisplay();

    // Set up refresh interval
    if (refreshInterval > 0) {
      const interval = setInterval(updateDisplay, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [timestamp, refreshInterval, displayOptions.showSeconds, displayOptions.useShortFormat, displayOptions.includeStaleWarning]);

  return displayTime;
}

/**
 * Hook for monitoring staleness of a timestamp
 * @param timestamp - Date object or ISO string
 * @param stalenessThreshold - Threshold in minutes
 * @returns Staleness information
 */
export function useStalenessMonitor(
  timestamp: Date | string | null,
  stalenessThreshold: number = 15
): StalenessInfo {
  const [stalenessInfo, setStalenessInfo] = useState<StalenessInfo>({
    isStale: true,
    minutesSinceUpdate: 0,
    warningLevel: 'none',
    message: 'No timestamp provided'
  });

  useEffect(() => {
    const updateStaleness = () => {
      if (!timestamp) {
        setStalenessInfo({
          isStale: true,
          minutesSinceUpdate: Infinity,
          warningLevel: 'critical',
          message: 'No timestamp provided'
        });
        return;
      }

      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      const manager = new TimestampManager(stalenessThreshold);
      manager.updateTimestamp(true, date);
      setStalenessInfo(manager.getStalenessInfo());
    };

    // Initial update
    updateStaleness();

    // Update every 30 seconds
    const interval = setInterval(updateStaleness, 30000);
    return () => clearInterval(interval);
  }, [timestamp, stalenessThreshold]);

  return stalenessInfo;
}