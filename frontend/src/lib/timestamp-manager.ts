// /frontend/src/lib/timestamp-manager.ts

/**
 * Enhanced timestamp management system for DULMS Watcher
 * Handles accurate time tracking, separates actual vs display times,
 * and provides staleness detection with warning indicators
 */

export interface TimestampData {
  actualUpdateTime: Date | null;
  displayUpdateTime: Date | null;
  stalenessThreshold: number; // minutes
  lastSuccessfulOperation: Date | null;
  failedOperationCount: number;
}

export interface TimeDisplayOptions {
  showSeconds?: boolean;
  useShortFormat?: boolean;
  includeStaleWarning?: boolean;
}

export interface StalenessInfo {
  isStale: boolean;
  minutesSinceUpdate: number;
  warningLevel: 'none' | 'warning' | 'critical';
  message: string;
}

export class TimestampManager {
  private actualUpdateTime: Date | null = null;
  private displayUpdateTime: Date | null = null;
  private stalenessThreshold: number = 15; // Default 15 minutes
  private lastSuccessfulOperation: Date | null = null;
  private failedOperationCount: number = 0;

  constructor(stalenessThreshold: number = 15) {
    this.stalenessThreshold = stalenessThreshold;
  }

  /**
   * Updates timestamp based on operation success
   * Only updates display time if operation was successful
   * @param successful - Whether the operation was successful
   * @param operationTime - Optional specific time for the operation
   */
  updateTimestamp(successful: boolean, operationTime?: Date): void {
    const now = operationTime || new Date();
    
    if (successful) {
      this.actualUpdateTime = now;
      this.displayUpdateTime = now;
      this.lastSuccessfulOperation = now;
      this.failedOperationCount = 0;
    } else {
      // Don't update display time for failed operations
      // But track the failed operation
      this.failedOperationCount++;
    }
  }

  /**
   * Gets the display time string with proper formatting
   * @param options - Display formatting options
   * @returns Formatted time string
   */
  getDisplayTime(options: TimeDisplayOptions = {}): string {
    if (!this.displayUpdateTime) {
      return 'Never updated';
    }

    const now = new Date(Date.now());
    const diffMs = now.getTime() - this.displayUpdateTime.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    let timeString: string;

    if (options.useShortFormat) {
      // Short format for compact displays
      if (diffMinutes < 1) timeString = 'NOW';
      else if (diffMinutes < 60) timeString = `${diffMinutes}M`;
      else if (diffHours < 24) timeString = `${diffHours}H`;
      else timeString = `${diffDays}D`;
    } else {
      // Standard format
      if (diffMinutes < 1) {
        timeString = options.showSeconds ? 
          `${Math.floor(diffMs / 1000)} SECONDS AGO` : 
          'LESS_THAN A MINUTE';
      } else if (diffMinutes < 60) {
        timeString = `${diffMinutes} MINUTE${diffMinutes === 1 ? '' : 'S'} AGO`;
      } else if (diffHours < 24) {
        timeString = `${diffHours} HOUR${diffHours === 1 ? '' : 'S'} AGO`;
      } else {
        timeString = `${diffDays} DAY${diffDays === 1 ? '' : 'S'} AGO`;
      }
    }

    // Add staleness warning if requested
    if (options.includeStaleWarning && this.isStale()) {
      const staleness = this.getStalenessInfo();
      timeString += ` (${staleness.warningLevel.toUpperCase()})`;
    }

    return timeString;
  }

  /**
   * Checks if the data is considered stale
   * @param customThreshold - Optional custom threshold in minutes
   * @returns Boolean indicating staleness
   */
  isStale(customThreshold?: number): boolean {
    if (!this.actualUpdateTime) return true;

    const threshold = customThreshold || this.stalenessThreshold;
    const now = new Date(Date.now());
    const diffMinutes = (now.getTime() - this.actualUpdateTime.getTime()) / 60000;
    
    return diffMinutes > threshold;
  }

  /**
   * Gets detailed staleness information
   * @returns Staleness information object
   */
  getStalenessInfo(): StalenessInfo {
    if (!this.actualUpdateTime) {
      return {
        isStale: true,
        minutesSinceUpdate: Infinity,
        warningLevel: 'critical',
        message: 'No successful updates recorded'
      };
    }

    const now = new Date(Date.now());
    const minutesSinceUpdate = Math.floor((now.getTime() - this.actualUpdateTime.getTime()) / 60000);
    const isStale = minutesSinceUpdate > this.stalenessThreshold;

    let warningLevel: 'none' | 'warning' | 'critical' = 'none';
    let message = 'Data is current';

    if (isStale) {
      if (minutesSinceUpdate > this.stalenessThreshold * 3) {
        warningLevel = 'critical';
        message = `Data is severely outdated (${minutesSinceUpdate} minutes old)`;
      } else if (minutesSinceUpdate > this.stalenessThreshold) {
        warningLevel = 'warning';
        message = `Data may be stale (${minutesSinceUpdate} minutes old)`;
      }
    }

    return {
      isStale,
      minutesSinceUpdate,
      warningLevel,
      message
    };
  }

  /**
   * Calculates precise time difference in various units
   * @param targetTime - Time to compare against (defaults to now)
   * @returns Object with time differences in various units
   */
  getTimeDifference(targetTime?: Date): {
    milliseconds: number;
    seconds: number;
    minutes: number;
    hours: number;
    days: number;
    formattedDifference: string;
  } {
    if (!this.actualUpdateTime) {
      return {
        milliseconds: 0,
        seconds: 0,
        minutes: 0,
        hours: 0,
        days: 0,
        formattedDifference: 'No update time available'
      };
    }

    const target = targetTime || new Date();
    const diffMs = target.getTime() - this.actualUpdateTime.getTime();
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // Create a human-readable formatted difference
    let formattedDifference: string;
    if (days > 0) {
      formattedDifference = `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      formattedDifference = `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      formattedDifference = `${minutes}m ${seconds % 60}s`;
    } else {
      formattedDifference = `${seconds}s`;
    }

    return {
      milliseconds: diffMs,
      seconds,
      minutes,
      hours,
      days,
      formattedDifference
    };
  }

  /**
   * Gets the actual last update time (not display time)
   * @returns Date object or null
   */
  getActualUpdateTime(): Date | null {
    return this.actualUpdateTime;
  }

  /**
   * Gets the display update time
   * @returns Date object or null
   */
  getDisplayUpdateTime(): Date | null {
    return this.displayUpdateTime;
  }

  /**
   * Gets the last successful operation time
   * @returns Date object or null
   */
  getLastSuccessfulOperation(): Date | null {
    return this.lastSuccessfulOperation;
  }

  /**
   * Gets the count of failed operations since last success
   * @returns Number of failed operations
   */
  getFailedOperationCount(): number {
    return this.failedOperationCount;
  }

  /**
   * Sets a custom staleness threshold
   * @param minutes - Threshold in minutes
   */
  setStalenessThreshold(minutes: number): void {
    this.stalenessThreshold = Math.max(1, minutes); // Minimum 1 minute
  }

  /**
   * Gets the current staleness threshold
   * @returns Threshold in minutes
   */
  getStalenessThreshold(): number {
    return this.stalenessThreshold;
  }

  /**
   * Resets all timestamp data
   */
  reset(): void {
    this.actualUpdateTime = null;
    this.displayUpdateTime = null;
    this.lastSuccessfulOperation = null;
    this.failedOperationCount = 0;
  }

  /**
   * Exports current state for persistence
   * @returns Serializable timestamp data
   */
  exportState(): TimestampData {
    return {
      actualUpdateTime: this.actualUpdateTime,
      displayUpdateTime: this.displayUpdateTime,
      stalenessThreshold: this.stalenessThreshold,
      lastSuccessfulOperation: this.lastSuccessfulOperation,
      failedOperationCount: this.failedOperationCount
    };
  }

  /**
   * Imports state from persistence
   * @param data - Previously exported timestamp data
   */
  importState(data: TimestampData): void {
    this.actualUpdateTime = data.actualUpdateTime ? new Date(data.actualUpdateTime) : null;
    this.displayUpdateTime = data.displayUpdateTime ? new Date(data.displayUpdateTime) : null;
    this.stalenessThreshold = data.stalenessThreshold || 15;
    this.lastSuccessfulOperation = data.lastSuccessfulOperation ? new Date(data.lastSuccessfulOperation) : null;
    this.failedOperationCount = data.failedOperationCount || 0;
  }

  /**
   * Creates a formatted timestamp for logging purposes
   * @param includeMilliseconds - Whether to include milliseconds
   * @returns Formatted timestamp string
   */
  getLogTimestamp(includeMilliseconds: boolean = false): string {
    const now = new Date();
    const format = includeMilliseconds ? 
      'YYYY-MM-DD HH:mm:ss.SSS' : 
      'YYYY-MM-DD HH:mm:ss';
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    let timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    
    if (includeMilliseconds) {
      const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
      timestamp += `.${milliseconds}`;
    }
    
    return timestamp;
  }
}

/**
 * Utility function to create a TimestampManager instance with initial data
 * @param initialData - Optional initial timestamp data
 * @param stalenessThreshold - Optional staleness threshold in minutes
 * @returns New TimestampManager instance
 */
export function createTimestampManager(
  initialData?: Partial<TimestampData>, 
  stalenessThreshold?: number
): TimestampManager {
  const manager = new TimestampManager(stalenessThreshold);
  
  if (initialData) {
    manager.importState({
      actualUpdateTime: null,
      displayUpdateTime: null,
      stalenessThreshold: stalenessThreshold || 15,
      lastSuccessfulOperation: null,
      failedOperationCount: 0,
      ...initialData
    });
  }
  
  return manager;
}

/**
 * Utility function to format a timestamp for display
 * @param timestamp - Date object or ISO string
 * @param options - Display options
 * @returns Formatted timestamp string
 */
export function formatTimestampForDisplay(
  timestamp: Date | string | null, 
  options: TimeDisplayOptions = {}
): string {
  if (!timestamp) return 'Never updated';
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const manager = new TimestampManager();
  manager.updateTimestamp(true, date);
  
  return manager.getDisplayTime(options);
}