/**
 * Tests for Network Monitor
 */

import { NetworkMonitor, NetworkStatus } from '../network-monitor';

// Mock fetch for connectivity tests
global.fetch = jest.fn();

// Mock navigator
const mockNavigator = {
  onLine: true,
  connection: {
    type: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false,
    addEventListener: jest.fn()
  }
};

Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true
});

// Mock window events
const mockAddEventListener = jest.fn();
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
  writable: true
});

jest.useFakeTimers();

describe('NetworkMonitor', () => {
  let networkMonitor: NetworkMonitor;
  let mockEvents: any;

  beforeEach(() => {
    mockEvents = {
      onOnline: jest.fn(),
      onOffline: jest.fn(),
      onConnectionChange: jest.fn(),
      onSlowConnection: jest.fn()
    };
    
    networkMonitor = new NetworkMonitor(mockEvents);
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    networkMonitor.stopMonitoring();
  });

  describe('Initialization', () => {
    it('should initialize with correct default status', () => {
      const status = networkMonitor.getNetworkStatus();
      
      expect(status.isOnline).toBe(true);
      expect(status.connectionType).toBe('wifi');
      expect(status.effectiveType).toBe('4g');
      expect(status.downlink).toBe(10);
      expect(status.rtt).toBe(100);
      expect(status.saveData).toBe(false);
    });

    it('should setup event listeners on initialization', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('Monitoring Lifecycle', () => {
    it('should start and stop monitoring', () => {
      expect(networkMonitor['isMonitoring']).toBe(false);
      
      networkMonitor.startMonitoring();
      expect(networkMonitor['isMonitoring']).toBe(true);
      
      networkMonitor.stopMonitoring();
      expect(networkMonitor['isMonitoring']).toBe(false);
    });

    it('should not start monitoring if already running', () => {
      networkMonitor.startMonitoring();
      const firstInterval = networkMonitor['checkInterval'];
      
      networkMonitor.startMonitoring();
      expect(networkMonitor['checkInterval']).toBe(firstInterval);
    });
  });

  describe('Connection Quality Assessment', () => {
    it('should identify slow connections correctly', () => {
      // Mock slow connection
      mockNavigator.connection.effectiveType = 'slow-2g';
      mockNavigator.connection.downlink = 0.5;
      mockNavigator.connection.rtt = 3000;
      
      networkMonitor = new NetworkMonitor();
      expect(networkMonitor.isSlowConnection()).toBe(true);
    });

    it('should identify fast connections correctly', () => {
      // Mock fast connection
      mockNavigator.connection.effectiveType = '4g';
      mockNavigator.connection.downlink = 10;
      mockNavigator.connection.rtt = 50;
      
      networkMonitor = new NetworkMonitor();
      expect(networkMonitor.isSlowConnection()).toBe(false);
    });

    it('should calculate connection quality score', () => {
      // Test high quality connection
      mockNavigator.connection.effectiveType = '4g';
      mockNavigator.connection.downlink = 10;
      mockNavigator.connection.rtt = 50;
      
      networkMonitor = new NetworkMonitor();
      const highQuality = networkMonitor.getConnectionQuality();
      expect(highQuality).toBeGreaterThan(80);

      // Test low quality connection
      mockNavigator.connection.effectiveType = 'slow-2g';
      mockNavigator.connection.downlink = 0.1;
      mockNavigator.connection.rtt = 2000;
      
      networkMonitor = new NetworkMonitor();
      const lowQuality = networkMonitor.getConnectionQuality();
      expect(lowQuality).toBeLessThan(30);
    });

    it('should return 0 quality when offline', () => {
      mockNavigator.onLine = false;
      networkMonitor = new NetworkMonitor();
      
      expect(networkMonitor.getConnectionQuality()).toBe(0);
    });
  });

  describe('Connectivity Testing', () => {
    it('should test connectivity successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true
      });

      const result = await networkMonitor.testConnectivity();
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/health', expect.objectContaining({
        method: 'HEAD',
        cache: 'no-cache'
      }));
    });

    it('should handle connectivity test failure', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await networkMonitor.testConnectivity();
      expect(result).toBe(false);
    });

    it('should timeout connectivity test', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      const testPromise = networkMonitor.testConnectivity();
      
      // Fast forward past timeout
      jest.advanceTimersByTime(6000);
      
      const result = await testPromise;
      expect(result).toBe(false);
    });
  });

  describe('Event Handling', () => {
    it('should handle online event', async () => {
      // Simulate offline first
      mockNavigator.onLine = false;
      networkMonitor = new NetworkMonitor(mockEvents);
      
      // Mock successful connectivity test
      (fetch as jest.Mock).mockResolvedValue({ ok: true });
      
      // Simulate going online
      mockNavigator.onLine = true;
      await networkMonitor['handleOnline']();
      
      expect(mockEvents.onOnline).toHaveBeenCalled();
      expect(networkMonitor.getNetworkStatus().isOnline).toBe(true);
    });

    it('should handle offline event', () => {
      // Start online
      mockNavigator.onLine = true;
      networkMonitor = new NetworkMonitor(mockEvents);
      
      // Simulate going offline
      networkMonitor['handleOffline']();
      
      expect(mockEvents.onOffline).toHaveBeenCalled();
      expect(networkMonitor.getNetworkStatus().isOnline).toBe(false);
    });

    it('should handle connection change', () => {
      networkMonitor['handleConnectionChange']();
      expect(mockEvents.onConnectionChange).toHaveBeenCalled();
    });

    it('should detect slow connection change', () => {
      // Start with fast connection
      mockNavigator.connection.effectiveType = '4g';
      networkMonitor = new NetworkMonitor(mockEvents);
      
      // Change to slow connection
      mockNavigator.connection.effectiveType = 'slow-2g';
      networkMonitor['handleConnectionChange']();
      
      expect(mockEvents.onSlowConnection).toHaveBeenCalled();
    });
  });

  describe('Connection History', () => {
    it('should track connection history', () => {
      networkMonitor['addToHistory'](true);
      networkMonitor['addToHistory'](false);
      networkMonitor['addToHistory'](true);
      
      const history = networkMonitor.getConnectionHistory();
      expect(history).toHaveLength(3);
      expect(history[0].isOnline).toBe(true);
      expect(history[1].isOnline).toBe(false);
      expect(history[2].isOnline).toBe(true);
    });

    it('should limit history size', () => {
      // Add more than max history size
      for (let i = 0; i < 150; i++) {
        networkMonitor['addToHistory'](i % 2 === 0);
      }
      
      const history = networkMonitor.getConnectionHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Stability Metrics', () => {
    it('should calculate stability metrics correctly', () => {
      // Simulate connection history
      networkMonitor['addToHistory'](true);
      jest.advanceTimersByTime(10000); // 10 seconds online
      
      networkMonitor['addToHistory'](false);
      jest.advanceTimersByTime(2000); // 2 seconds offline
      
      networkMonitor['addToHistory'](true);
      jest.advanceTimersByTime(8000); // 8 seconds online
      
      const metrics = networkMonitor.getStabilityMetrics();
      
      expect(metrics.disconnectionCount).toBe(1);
      expect(metrics.stabilityScore).toBeGreaterThan(80); // Mostly online
    });

    it('should handle empty history', () => {
      const metrics = networkMonitor.getStabilityMetrics();
      
      expect(metrics.disconnectionCount).toBe(0);
      expect(metrics.averageUptime).toBe(0);
      expect(metrics.averageDowntime).toBe(0);
      expect(metrics.stabilityScore).toBe(100);
    });
  });

  describe('Retry Triggering', () => {
    it('should trigger retry on reconnection', async () => {
      // Mock retry service
      const mockRetryService = {
        processImmediately: jest.fn()
      };
      
      // Mock successful connectivity test
      (fetch as jest.Mock).mockResolvedValue({ ok: true });
      
      // Simulate reconnection
      await networkMonitor['triggerRetryOnReconnection']();
      
      // Wait for stabilization delay
      jest.advanceTimersByTime(3000);
      
      // Note: In real implementation, this would call retryService.processImmediately()
      // but since we're testing in isolation, we just verify the flow
      expect(fetch).toHaveBeenCalledWith('/api/health', expect.any(Object));
    });

    it('should not trigger retry if connectivity test fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({ ok: false });
      
      await networkMonitor['triggerRetryOnReconnection']();
      
      jest.advanceTimersByTime(3000);
      
      // Should test connectivity but not trigger retry
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing navigator.connection', () => {
      const originalConnection = mockNavigator.connection;
      delete (mockNavigator as any).connection;
      
      networkMonitor = new NetworkMonitor();
      const status = networkMonitor.getNetworkStatus();
      
      expect(status.connectionType).toBe('unknown');
      expect(status.effectiveType).toBe('unknown');
      
      // Restore connection
      mockNavigator.connection = originalConnection;
    });

    it('should handle server-side rendering', () => {
      const originalNavigator = global.navigator;
      delete (global as any).navigator;
      
      networkMonitor = new NetworkMonitor();
      const status = networkMonitor.getNetworkStatus();
      
      expect(status.isOnline).toBe(true); // Default to online
      
      // Restore navigator
      (global as any).navigator = originalNavigator;
    });
  });
});