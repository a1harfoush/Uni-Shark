// /frontend/src/lib/__tests__/timestamp-manager.test.ts

import { TimestampManager, createTimestampManager, formatTimestampForDisplay } from '../timestamp-manager';

describe('TimestampManager', () => {
  let timestampManager: TimestampManager;

  beforeEach(() => {
    timestampManager = new TimestampManager(15); // 15 minute staleness threshold
  });

  describe('Basic Functionality', () => {
    test('should initialize with null timestamps', () => {
      expect(timestampManager.getActualUpdateTime()).toBeNull();
      expect(timestampManager.getDisplayUpdateTime()).toBeNull();
      expect(timestampManager.getLastSuccessfulOperation()).toBeNull();
      expect(timestampManager.getFailedOperationCount()).toBe(0);
    });

    test('should update timestamps on successful operation', () => {
      const testTime = new Date('2025-07-18T12:00:00Z');
      timestampManager.updateTimestamp(true, testTime);

      expect(timestampManager.getActualUpdateTime()).toEqual(testTime);
      expect(timestampManager.getDisplayUpdateTime()).toEqual(testTime);
      expect(timestampManager.getLastSuccessfulOperation()).toEqual(testTime);
      expect(timestampManager.getFailedOperationCount()).toBe(0);
    });

    test('should not update display time on failed operation', () => {
      const successTime = new Date('2025-07-18T12:00:00Z');
      const failTime = new Date('2025-07-18T12:05:00Z');

      // First successful operation
      timestampManager.updateTimestamp(true, successTime);
      expect(timestampManager.getDisplayUpdateTime()).toEqual(successTime);

      // Failed operation should not update display time
      timestampManager.updateTimestamp(false, failTime);
      expect(timestampManager.getDisplayUpdateTime()).toEqual(successTime); // Should remain unchanged
      expect(timestampManager.getFailedOperationCount()).toBe(1);
    });

    test('should reset failed operation count on successful operation', () => {
      const testTime = new Date('2025-07-18T12:00:00Z');

      // Multiple failed operations
      timestampManager.updateTimestamp(false);
      timestampManager.updateTimestamp(false);
      timestampManager.updateTimestamp(false);
      expect(timestampManager.getFailedOperationCount()).toBe(3);

      // Successful operation should reset count
      timestampManager.updateTimestamp(true, testTime);
      expect(timestampManager.getFailedOperationCount()).toBe(0);
    });
  });

  describe('Display Time Formatting', () => {
    test('should return "Never updated" when no timestamp exists', () => {
      expect(timestampManager.getDisplayTime()).toBe('Never updated');
    });

    test('should format time correctly for different intervals', () => {
      const baseTime = new Date('2025-07-18T12:00:00Z');
      
      // Test different time intervals
      const testCases = [
        { offset: 30 * 1000, expected: 'LESS_THAN A MINUTE' }, // 30 seconds
        { offset: 2 * 60 * 1000, expected: '2 MINUTES AGO' }, // 2 minutes
        { offset: 1 * 60 * 60 * 1000, expected: '1 HOUR AGO' }, // 1 hour
        { offset: 2 * 60 * 60 * 1000, expected: '2 HOURS AGO' }, // 2 hours
        { offset: 25 * 60 * 60 * 1000, expected: '1 DAY AGO' }, // 25 hours
        { offset: 48 * 60 * 60 * 1000, expected: '2 DAYS AGO' }, // 48 hours
      ];

      testCases.forEach(({ offset, expected }) => {
        const updateTime = new Date(baseTime.getTime() - offset);
        timestampManager.updateTimestamp(true, updateTime);
        
        // Mock current time for consistent testing
        const originalNow = Date.now;
        Date.now = jest.fn(() => baseTime.getTime());
        
        expect(timestampManager.getDisplayTime()).toBe(expected);
        
        Date.now = originalNow;
      });
    });

    test('should format short format correctly', () => {
      const baseTime = new Date('2025-07-18T12:00:00Z');
      const updateTime = new Date(baseTime.getTime() - 2 * 60 * 1000); // 2 minutes ago
      
      timestampManager.updateTimestamp(true, updateTime);
      
      const originalNow = Date.now;
      Date.now = jest.fn(() => baseTime.getTime());
      
      expect(timestampManager.getDisplayTime({ useShortFormat: true })).toBe('2M');
      
      Date.now = originalNow;
    });

    test('should include seconds when requested', () => {
      const baseTime = new Date('2025-07-18T12:00:00Z');
      const updateTime = new Date(baseTime.getTime() - 30 * 1000); // 30 seconds ago
      
      timestampManager.updateTimestamp(true, updateTime);
      
      const originalNow = Date.now;
      Date.now = jest.fn(() => baseTime.getTime());
      
      expect(timestampManager.getDisplayTime({ showSeconds: true })).toBe('30 SECONDS AGO');
      
      Date.now = originalNow;
    });
  });

  describe('Staleness Detection', () => {
    test('should detect stale data correctly', () => {
      const baseTime = new Date('2025-07-18T12:00:00Z');
      
      // Fresh data (5 minutes old)
      const freshTime = new Date(baseTime.getTime() - 5 * 60 * 1000);
      timestampManager.updateTimestamp(true, freshTime);
      
      const originalNow = Date.now;
      Date.now = jest.fn(() => baseTime.getTime());
      
      expect(timestampManager.isStale()).toBe(false);
      
      // Stale data (20 minutes old, threshold is 15)
      const staleTime = new Date(baseTime.getTime() - 20 * 60 * 1000);
      timestampManager.updateTimestamp(true, staleTime);
      
      expect(timestampManager.isStale()).toBe(true);
      
      Date.now = originalNow;
    });

    test('should provide detailed staleness information', () => {
      const baseTime = new Date('2025-07-18T12:00:00Z');
      const staleTime = new Date(baseTime.getTime() - 20 * 60 * 1000); // 20 minutes old
      
      timestampManager.updateTimestamp(true, staleTime);
      
      const originalNow = Date.now;
      Date.now = jest.fn(() => baseTime.getTime());
      
      const stalenessInfo = timestampManager.getStalenessInfo();
      
      expect(stalenessInfo.isStale).toBe(true);
      expect(stalenessInfo.minutesSinceUpdate).toBe(20);
      expect(stalenessInfo.warningLevel).toBe('warning');
      expect(stalenessInfo.message).toContain('Data may be stale');
      
      Date.now = originalNow;
    });

    test('should detect critical staleness', () => {
      const baseTime = new Date('2025-07-18T12:00:00Z');
      const criticalTime = new Date(baseTime.getTime() - 60 * 60 * 1000); // 60 minutes old (4x threshold)
      
      timestampManager.updateTimestamp(true, criticalTime);
      
      const originalNow = Date.now;
      Date.now = jest.fn(() => baseTime.getTime());
      
      const stalenessInfo = timestampManager.getStalenessInfo();
      
      expect(stalenessInfo.warningLevel).toBe('critical');
      expect(stalenessInfo.message).toContain('severely outdated');
      
      Date.now = originalNow;
    });
  });

  describe('Time Difference Calculations', () => {
    test('should calculate time differences correctly', () => {
      const baseTime = new Date('2025-07-18T12:00:00Z');
      const updateTime = new Date(baseTime.getTime() - 2 * 60 * 60 * 1000 - 30 * 60 * 1000); // 2.5 hours ago
      
      timestampManager.updateTimestamp(true, updateTime);
      
      const timeDiff = timestampManager.getTimeDifference(baseTime);
      
      expect(timeDiff.hours).toBe(2);
      expect(timeDiff.minutes).toBe(150); // 2.5 hours = 150 minutes
      expect(timeDiff.formattedDifference).toBe('2h 30m 0s');
    });

    test('should handle no update time gracefully', () => {
      const timeDiff = timestampManager.getTimeDifference();
      
      expect(timeDiff.minutes).toBe(0);
      expect(timeDiff.formattedDifference).toBe('No update time available');
    });
  });

  describe('State Management', () => {
    test('should export and import state correctly', () => {
      const testTime = new Date('2025-07-18T12:00:00Z');
      timestampManager.updateTimestamp(true, testTime);
      timestampManager.updateTimestamp(false); // Add a failed operation
      
      const exportedState = timestampManager.exportState();
      
      expect(exportedState.actualUpdateTime).toEqual(testTime);
      expect(exportedState.displayUpdateTime).toEqual(testTime);
      expect(exportedState.failedOperationCount).toBe(1);
      expect(exportedState.stalenessThreshold).toBe(15);
      
      // Create new manager and import state
      const newManager = new TimestampManager();
      newManager.importState(exportedState);
      
      expect(newManager.getActualUpdateTime()).toEqual(testTime);
      expect(newManager.getDisplayUpdateTime()).toEqual(testTime);
      expect(newManager.getFailedOperationCount()).toBe(1);
      expect(newManager.getStalenessThreshold()).toBe(15);
    });

    test('should reset state correctly', () => {
      const testTime = new Date('2025-07-18T12:00:00Z');
      timestampManager.updateTimestamp(true, testTime);
      timestampManager.updateTimestamp(false);
      
      expect(timestampManager.getActualUpdateTime()).not.toBeNull();
      expect(timestampManager.getFailedOperationCount()).toBe(1);
      
      timestampManager.reset();
      
      expect(timestampManager.getActualUpdateTime()).toBeNull();
      expect(timestampManager.getDisplayUpdateTime()).toBeNull();
      expect(timestampManager.getLastSuccessfulOperation()).toBeNull();
      expect(timestampManager.getFailedOperationCount()).toBe(0);
    });
  });

  describe('Configuration', () => {
    test('should allow custom staleness threshold', () => {
      const customManager = new TimestampManager(30); // 30 minute threshold
      expect(customManager.getStalenessThreshold()).toBe(30);
      
      customManager.setStalenessThreshold(45);
      expect(customManager.getStalenessThreshold()).toBe(45);
    });

    test('should enforce minimum staleness threshold', () => {
      timestampManager.setStalenessThreshold(0);
      expect(timestampManager.getStalenessThreshold()).toBe(1); // Should be clamped to 1
    });
  });

  describe('Logging Utilities', () => {
    test('should generate log timestamps', () => {
      const logTimestamp = timestampManager.getLogTimestamp();
      expect(logTimestamp).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      
      const logTimestampWithMs = timestampManager.getLogTimestamp(true);
      expect(logTimestampWithMs).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
    });
  });
});

describe('Utility Functions', () => {
  describe('createTimestampManager', () => {
    test('should create manager with initial data', () => {
      const testTime = new Date('2025-07-18T12:00:00Z');
      const manager = createTimestampManager({
        actualUpdateTime: testTime,
        displayUpdateTime: testTime,
        failedOperationCount: 2
      }, 20);
      
      expect(manager.getActualUpdateTime()).toEqual(testTime);
      expect(manager.getDisplayUpdateTime()).toEqual(testTime);
      expect(manager.getFailedOperationCount()).toBe(2);
      expect(manager.getStalenessThreshold()).toBe(20);
    });
  });

  describe('formatTimestampForDisplay', () => {
    test('should format timestamp for display', () => {
      const testTime = new Date('2025-07-18T12:00:00Z');
      
      const originalNow = Date.now;
      Date.now = jest.fn(() => testTime.getTime() + 5 * 60 * 1000); // 5 minutes later
      
      const formatted = formatTimestampForDisplay(testTime);
      expect(formatted).toBe('5 MINUTES AGO');
      
      Date.now = originalNow;
    });

    test('should handle null timestamp', () => {
      const formatted = formatTimestampForDisplay(null);
      expect(formatted).toBe('Never updated');
    });

    test('should handle string timestamp', () => {
      const testTimeString = '2025-07-18T12:00:00Z';
      
      const originalNow = Date.now;
      Date.now = jest.fn(() => new Date(testTimeString).getTime() + 2 * 60 * 1000); // 2 minutes later
      
      const formatted = formatTimestampForDisplay(testTimeString);
      expect(formatted).toBe('2 MINUTES AGO');
      
      Date.now = originalNow;
    });
  });
});

describe('Requirements Verification', () => {
  test('Requirement 1.1: Actual time elapsed since last successful update', () => {
    const manager = new TimestampManager();
    const successTime = new Date('2025-07-18T12:00:00Z');
    const currentTime = new Date('2025-07-18T12:10:00Z'); // 10 minutes later
    
    manager.updateTimestamp(true, successTime);
    
    const originalNow = Date.now;
    Date.now = jest.fn(() => currentTime.getTime());
    
    const displayTime = manager.getDisplayTime();
    expect(displayTime).toBe('10 MINUTES AGO');
    
    Date.now = originalNow;
  });

  test('Requirement 1.2: Timestamp should not update on failed operations', () => {
    const manager = new TimestampManager();
    const successTime = new Date('2025-07-18T12:00:00Z');
    const failTime = new Date('2025-07-18T12:05:00Z');
    
    manager.updateTimestamp(true, successTime);
    const initialDisplayTime = manager.getDisplayUpdateTime();
    
    manager.updateTimestamp(false, failTime);
    const afterFailDisplayTime = manager.getDisplayUpdateTime();
    
    expect(afterFailDisplayTime).toEqual(initialDisplayTime);
  });

  test('Requirement 1.3: Only successful operations update timestamp', () => {
    const manager = new TimestampManager();
    
    // Multiple failed operations
    manager.updateTimestamp(false);
    manager.updateTimestamp(false);
    expect(manager.getDisplayUpdateTime()).toBeNull();
    
    // One successful operation
    const successTime = new Date('2025-07-18T12:00:00Z');
    manager.updateTimestamp(true, successTime);
    expect(manager.getDisplayUpdateTime()).toEqual(successTime);
  });

  test('Requirement 1.4: Time differences based on actual data timestamps', () => {
    const manager = new TimestampManager();
    const dataTime = new Date('2025-07-18T12:00:00Z');
    const currentTime = new Date('2025-07-18T12:15:00Z');
    
    manager.updateTimestamp(true, dataTime);
    
    const timeDiff = manager.getTimeDifference(currentTime);
    expect(timeDiff.minutes).toBe(15);
    expect(timeDiff.formattedDifference).toBe('15m 0s');
  });

  test('Requirement 1.5: Staleness warnings for old data', () => {
    const manager = new TimestampManager(10); // 10 minute threshold
    const oldTime = new Date('2025-07-18T12:00:00Z');
    const currentTime = new Date('2025-07-18T12:20:00Z'); // 20 minutes later
    
    manager.updateTimestamp(true, oldTime);
    
    const originalNow = Date.now;
    Date.now = jest.fn(() => currentTime.getTime());
    
    const stalenessInfo = manager.getStalenessInfo();
    expect(stalenessInfo.isStale).toBe(true);
    expect(stalenessInfo.warningLevel).toBe('warning');
    expect(stalenessInfo.message).toContain('stale');
    
    Date.now = originalNow;
  });
});