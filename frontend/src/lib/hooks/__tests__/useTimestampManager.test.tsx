// /frontend/src/lib/hooks/__tests__/useTimestampManager.test.tsx

import { renderHook, act } from '@testing-library/react';
import { useTimestampManager, useTimestampDisplay, useStalenessMonitor } from '../useTimestampManager';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('useTimestampManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('should initialize with default values', () => {
    const { result } = renderHook(() => useTimestampManager());

    expect(result.current.displayTime).toBe('Never updated');
    expect(result.current.isStale).toBe(true);
    expect(result.current.actualUpdateTime).toBeNull();
    expect(result.current.displayUpdateTime).toBeNull();
    expect(result.current.failedOperationCount).toBe(0);
  });

  test('should update timestamp on successful operation', () => {
    const { result } = renderHook(() => useTimestampManager());
    const testTime = new Date('2025-07-18T12:00:00Z');

    act(() => {
      result.current.updateTimestamp(true, testTime);
    });

    expect(result.current.actualUpdateTime).toEqual(testTime);
    expect(result.current.displayUpdateTime).toEqual(testTime);
    expect(result.current.failedOperationCount).toBe(0);
  });

  test('should not update display time on failed operation', () => {
    const { result } = renderHook(() => useTimestampManager());
    const successTime = new Date('2025-07-18T12:00:00Z');
    const failTime = new Date('2025-07-18T12:05:00Z');

    act(() => {
      result.current.updateTimestamp(true, successTime);
    });

    const initialDisplayTime = result.current.displayUpdateTime;

    act(() => {
      result.current.updateTimestamp(false, failTime);
    });

    expect(result.current.displayUpdateTime).toEqual(initialDisplayTime);
    expect(result.current.failedOperationCount).toBe(1);
  });

  test('should persist state to localStorage when persistKey is provided', () => {
    const persistKey = 'test-timestamp-key';
    const { result } = renderHook(() => useTimestampManager({ persistKey }));
    const testTime = new Date('2025-07-18T12:00:00Z');

    act(() => {
      result.current.updateTimestamp(true, testTime);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      persistKey,
      expect.stringContaining(testTime.toISOString())
    );
  });

  test('should load persisted state from localStorage', () => {
    const persistKey = 'test-timestamp-key';
    const testTime = new Date('2025-07-18T12:00:00Z');
    const persistedData = JSON.stringify({
      actualUpdateTime: testTime.toISOString(),
      displayUpdateTime: testTime.toISOString(),
      stalenessThreshold: 15,
      lastSuccessfulOperation: testTime.toISOString(),
      failedOperationCount: 2
    });

    localStorageMock.getItem.mockReturnValue(persistedData);

    const { result } = renderHook(() => useTimestampManager({ persistKey }));

    expect(result.current.actualUpdateTime).toEqual(testTime);
    expect(result.current.displayUpdateTime).toEqual(testTime);
    expect(result.current.failedOperationCount).toBe(2);
  });

  test('should reset all state', () => {
    const { result } = renderHook(() => useTimestampManager());
    const testTime = new Date('2025-07-18T12:00:00Z');

    act(() => {
      result.current.updateTimestamp(true, testTime);
      result.current.updateTimestamp(false);
    });

    expect(result.current.actualUpdateTime).not.toBeNull();
    expect(result.current.failedOperationCount).toBe(1);

    act(() => {
      result.current.reset();
    });

    expect(result.current.actualUpdateTime).toBeNull();
    expect(result.current.displayUpdateTime).toBeNull();
    expect(result.current.failedOperationCount).toBe(0);
  });

  test('should handle custom staleness threshold', () => {
    const { result } = renderHook(() => useTimestampManager({ stalenessThreshold: 30 }));

    expect(result.current.timestampManager.getStalenessThreshold()).toBe(30);
  });
});

describe('useTimestampDisplay', () => {
  test('should return "Never updated" for null timestamp', () => {
    const { result } = renderHook(() => useTimestampDisplay(null));

    expect(result.current).toBe('Never updated');
  });

  test('should format timestamp correctly', () => {
    const testTime = new Date('2025-07-18T12:00:00Z');
    
    const originalNow = Date.now;
    Date.now = jest.fn(() => testTime.getTime() + 5 * 60 * 1000); // 5 minutes later

    const { result } = renderHook(() => useTimestampDisplay(testTime));

    expect(result.current).toBe('5 MINUTES AGO');

    Date.now = originalNow;
  });

  test('should handle string timestamp', () => {
    const testTimeString = '2025-07-18T12:00:00Z';
    
    const originalNow = Date.now;
    Date.now = jest.fn(() => new Date(testTimeString).getTime() + 2 * 60 * 1000); // 2 minutes later

    const { result } = renderHook(() => useTimestampDisplay(testTimeString));

    expect(result.current).toBe('2 MINUTES AGO');

    Date.now = originalNow;
  });

  test('should use short format when requested', () => {
    const testTime = new Date('2025-07-18T12:00:00Z');
    
    const originalNow = Date.now;
    Date.now = jest.fn(() => testTime.getTime() + 30 * 60 * 1000); // 30 minutes later

    const { result } = renderHook(() => useTimestampDisplay(testTime, { useShortFormat: true }));

    expect(result.current).toBe('30M');

    Date.now = originalNow;
  });
});

describe('useStalenessMonitor', () => {
  test('should return critical staleness for null timestamp', () => {
    const { result } = renderHook(() => useStalenessMonitor(null));

    expect(result.current.isStale).toBe(true);
    expect(result.current.warningLevel).toBe('critical');
    expect(result.current.message).toContain('No timestamp provided');
  });

  test('should detect fresh data correctly', () => {
    const testTime = new Date('2025-07-18T12:00:00Z');
    
    const originalNow = Date.now;
    Date.now = jest.fn(() => testTime.getTime() + 5 * 60 * 1000); // 5 minutes later

    const { result } = renderHook(() => useStalenessMonitor(testTime, 15)); // 15 minute threshold

    expect(result.current.isStale).toBe(false);
    expect(result.current.warningLevel).toBe('none');

    Date.now = originalNow;
  });

  test('should detect stale data correctly', () => {
    const testTime = new Date('2025-07-18T12:00:00Z');
    
    const originalNow = Date.now;
    Date.now = jest.fn(() => testTime.getTime() + 20 * 60 * 1000); // 20 minutes later

    const { result } = renderHook(() => useStalenessMonitor(testTime, 15)); // 15 minute threshold

    expect(result.current.isStale).toBe(true);
    expect(result.current.warningLevel).toBe('warning');
    expect(result.current.message).toContain('stale');

    Date.now = originalNow;
  });

  test('should detect critical staleness', () => {
    const testTime = new Date('2025-07-18T12:00:00Z');
    
    const originalNow = Date.now;
    Date.now = jest.fn(() => testTime.getTime() + 60 * 60 * 1000); // 60 minutes later

    const { result } = renderHook(() => useStalenessMonitor(testTime, 15)); // 15 minute threshold

    expect(result.current.isStale).toBe(true);
    expect(result.current.warningLevel).toBe('critical');
    expect(result.current.message).toContain('severely outdated');

    Date.now = originalNow;
  });

  test('should handle string timestamp', () => {
    const testTimeString = '2025-07-18T12:00:00Z';
    
    const originalNow = Date.now;
    Date.now = jest.fn(() => new Date(testTimeString).getTime() + 10 * 60 * 1000); // 10 minutes later

    const { result } = renderHook(() => useStalenessMonitor(testTimeString, 15));

    expect(result.current.isStale).toBe(false);
    expect(result.current.warningLevel).toBe('none');

    Date.now = originalNow;
  });
});

describe('Integration Tests', () => {
  test('should work together for complete timestamp management', () => {
    const { result: managerResult } = renderHook(() => useTimestampManager({
      stalenessThreshold: 10,
      persistKey: 'integration-test'
    }));

    const testTime = new Date('2025-07-18T12:00:00Z');

    // Update with successful operation
    act(() => {
      managerResult.current.updateTimestamp(true, testTime);
    });

    // Test display hook with the same timestamp
    const originalNow = Date.now;
    Date.now = jest.fn(() => testTime.getTime() + 5 * 60 * 1000); // 5 minutes later

    const { result: displayResult } = renderHook(() => 
      useTimestampDisplay(testTime, { refreshInterval: 0 })
    );

    const { result: stalenessResult } = renderHook(() => 
      useStalenessMonitor(testTime, 10)
    );

    expect(displayResult.current).toBe('5 MINUTES AGO');
    expect(stalenessResult.current.isStale).toBe(false);
    expect(stalenessResult.current.warningLevel).toBe('none');

    Date.now = originalNow;
  });
});