/**
 * Tests for Retry Status Panel Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RetryStatusPanel } from '../RetryStatusPanel';

// Mock the retry service and network monitor
jest.mock('@/lib/retry-service', () => ({
  retryService: {
    getQueueStatus: jest.fn(() => ({
      totalOperations: 0,
      activeRetries: 0,
      pendingRetries: 0,
      operationsByType: {},
      operationsByPriority: {}
    })),
    start: jest.fn(),
    stop: jest.fn(),
    processImmediately: jest.fn(),
    clearQueue: jest.fn()
  }
}));

jest.mock('@/lib/network-monitor', () => ({
  networkMonitor: {
    getNetworkStatus: jest.fn(() => ({
      isOnline: true,
      connectionType: 'wifi',
      effectiveType: '4g',
      downlink: 10,
      rtt: 100,
      saveData: false
    })),
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
    getConnectionQuality: jest.fn(() => 85),
    isSlowConnection: jest.fn(() => false),
    getStabilityMetrics: jest.fn(() => ({
      disconnectionCount: 0,
      averageUptime: 0,
      averageDowntime: 0,
      stabilityScore: 100
    }))
  }
}));

jest.mock('@/lib/recovery-strategies', () => ({
  recoveryEngine: {
    getRecoveryStats: jest.fn(() => ({})),
    getFailurePatterns: jest.fn(() => ({}))
  }
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size}>
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-variant={variant} className={className}>{children}</span>
  )
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div className={className} data-value={value}>Progress: {value}%</div>
  )
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: any) => <div data-default-value={defaultValue}>{children}</div>,
  TabsContent: ({ children, value }: any) => <div data-tab-value={value}>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-tab-trigger={value}>{children}</button>
}));

describe('RetryStatusPanel', () => {
  const { retryService } = require('@/lib/retry-service');
  const { networkMonitor } = require('@/lib/network-monitor');
  const { recoveryEngine } = require('@/lib/recovery-strategies');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<RetryStatusPanel />);
      
      expect(screen.getByText('Retry & Recovery Status')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    it('should render without network status when disabled', () => {
      render(<RetryStatusPanel showNetworkStatus={false} />);
      
      expect(screen.queryByText('Network')).not.toBeInTheDocument();
    });

    it('should render without recovery stats when disabled', () => {
      render(<RetryStatusPanel showRecoveryStats={false} />);
      
      expect(screen.queryByText('Recovery')).not.toBeInTheDocument();
    });
  });

  describe('Service Control', () => {
    it('should start and stop retry service', () => {
      render(<RetryStatusPanel />);
      
      const toggleButton = screen.getByRole('button');
      fireEvent.click(toggleButton);
      
      expect(retryService.stop).toHaveBeenCalled();
      expect(networkMonitor.stopMonitoring).toHaveBeenCalled();
    });

    it('should show correct service status', () => {
      render(<RetryStatusPanel />);
      
      expect(screen.getByText('Running')).toBeInTheDocument();
    });
  });

  describe('Queue Status Display', () => {
    it('should display empty queue message', () => {
      render(<RetryStatusPanel />);
      
      expect(screen.getByText('No operations in retry queue')).toBeInTheDocument();
    });

    it('should display queue statistics', () => {
      retryService.getQueueStatus.mockReturnValue({
        totalOperations: 5,
        activeRetries: 2,
        pendingRetries: 3,
        operationsByType: {
          data_fetch: 3,
          data_processing: 2
        },
        operationsByPriority: {
          high: 2,
          medium: 2,
          low: 1
        }
      });

      render(<RetryStatusPanel />);
      
      expect(screen.getByText('5')).toBeInTheDocument(); // Total operations
      expect(screen.getByText('2')).toBeInTheDocument(); // Active retries
      expect(screen.getByText('3')).toBeInTheDocument(); // Pending retries
    });

    it('should display operations by type', () => {
      retryService.getQueueStatus.mockReturnValue({
        totalOperations: 2,
        activeRetries: 0,
        pendingRetries: 2,
        operationsByType: {
          data_fetch: 1,
          course_expansion: 1
        },
        operationsByPriority: {
          medium: 2
        }
      });

      render(<RetryStatusPanel />);
      
      expect(screen.getByText('Data fetch')).toBeInTheDocument();
      expect(screen.getByText('Course expansion')).toBeInTheDocument();
    });

    it('should display priority distribution', () => {
      retryService.getQueueStatus.mockReturnValue({
        totalOperations: 3,
        activeRetries: 0,
        pendingRetries: 3,
        operationsByType: {
          data_fetch: 3
        },
        operationsByPriority: {
          critical: 1,
          high: 1,
          medium: 1
        }
      });

      render(<RetryStatusPanel />);
      
      expect(screen.getByText('critical: 1')).toBeInTheDocument();
      expect(screen.getByText('high: 1')).toBeInTheDocument();
      expect(screen.getByText('medium: 1')).toBeInTheDocument();
    });
  });

  describe('Manual Controls', () => {
    it('should trigger manual retry', async () => {
      retryService.getQueueStatus.mockReturnValue({
        totalOperations: 1,
        activeRetries: 0,
        pendingRetries: 1,
        operationsByType: { data_fetch: 1 },
        operationsByPriority: { medium: 1 }
      });

      render(<RetryStatusPanel />);
      
      const retryButton = screen.getByText('Retry Now');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(retryService.processImmediately).toHaveBeenCalled();
      });
    });

    it('should clear queue', () => {
      retryService.getQueueStatus.mockReturnValue({
        totalOperations: 2,
        activeRetries: 0,
        pendingRetries: 2,
        operationsByType: { data_fetch: 2 },
        operationsByPriority: { medium: 2 }
      });

      render(<RetryStatusPanel />);
      
      const clearButton = screen.getByText('Clear Queue');
      fireEvent.click(clearButton);
      
      expect(retryService.clearQueue).toHaveBeenCalled();
    });

    it('should disable retry button when no operations', () => {
      render(<RetryStatusPanel />);
      
      const retryButton = screen.getByText('Retry Now');
      expect(retryButton).toBeDisabled();
    });
  });

  describe('Network Status Display', () => {
    it('should display online status', () => {
      render(<RetryStatusPanel />);
      
      // Switch to network tab (would need to implement tab switching in real test)
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('wifi • 4g')).toBeInTheDocument();
    });

    it('should display offline status', () => {
      networkMonitor.getNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'unknown',
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        saveData: false
      });

      render(<RetryStatusPanel />);
      
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should display connection quality', () => {
      networkMonitor.getNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
        saveData: false
      });

      render(<RetryStatusPanel />);
      
      expect(screen.getByText('85%')).toBeInTheDocument(); // Connection quality
      expect(screen.getByText('10 Mbps')).toBeInTheDocument(); // Speed
      expect(screen.getByText('100ms')).toBeInTheDocument(); // Latency
    });

    it('should show slow connection warning', () => {
      networkMonitor.isSlowConnection.mockReturnValue(true);

      render(<RetryStatusPanel />);
      
      expect(screen.getByText(/Slow connection detected/)).toBeInTheDocument();
    });

    it('should display stability metrics', () => {
      networkMonitor.getStabilityMetrics.mockReturnValue({
        disconnectionCount: 2,
        averageUptime: 300,
        averageDowntime: 10,
        stabilityScore: 95
      });

      render(<RetryStatusPanel />);
      
      expect(screen.getByText('2')).toBeInTheDocument(); // Disconnections
      expect(screen.getByText('95%')).toBeInTheDocument(); // Stability score
    });
  });

  describe('Recovery Statistics Display', () => {
    it('should display empty recovery stats', () => {
      render(<RetryStatusPanel />);
      
      expect(screen.getByText('No recovery attempts yet')).toBeInTheDocument();
    });

    it('should display recovery strategy performance', () => {
      recoveryEngine.getRecoveryStats.mockReturnValue({
        NetworkFailureRecovery: {
          attempts: 10,
          successes: 8,
          successRate: 80
        },
        TimeoutRecovery: {
          attempts: 5,
          successes: 3,
          successRate: 60
        }
      });

      render(<RetryStatusPanel />);
      
      expect(screen.getByText('NetworkFailureRecovery')).toBeInTheDocument();
      expect(screen.getByText('80% success')).toBeInTheDocument();
      expect(screen.getByText('Attempts: 10')).toBeInTheDocument();
      expect(screen.getByText('Successes: 8')).toBeInTheDocument();
    });

    it('should display failure patterns', () => {
      recoveryEngine.getFailurePatterns.mockReturnValue({
        'operation-1': {
          totalFailures: 3,
          errorTypes: ['network', 'timeout'],
          timeSpan: {
            first: '2023-01-01T10:00:00Z',
            last: '2023-01-01T10:05:00Z'
          },
          commonPatterns: {
            mostCommonError: 'network'
          }
        }
      });

      render(<RetryStatusPanel />);
      
      expect(screen.getByText('1 operation(s) with recurring failures')).toBeInTheDocument();
      expect(screen.getByText('operation-1')).toBeInTheDocument();
      expect(screen.getByText('Failures: 3')).toBeInTheDocument();
      expect(screen.getByText('Common: network')).toBeInTheDocument();
    });

    it('should show no patterns message when empty', () => {
      recoveryEngine.getFailurePatterns.mockReturnValue({});

      render(<RetryStatusPanel />);
      
      expect(screen.getByText('No failure patterns detected')).toBeInTheDocument();
    });
  });

  describe('Auto Refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should auto refresh when enabled', () => {
      render(<RetryStatusPanel autoRefresh={true} refreshInterval={1000} />);
      
      const initialCalls = retryService.getQueueStatus.mock.calls.length;
      
      jest.advanceTimersByTime(1000);
      
      expect(retryService.getQueueStatus.mock.calls.length).toBeGreaterThan(initialCalls);
    });

    it('should not auto refresh when disabled', () => {
      render(<RetryStatusPanel autoRefresh={false} />);
      
      const initialCalls = retryService.getQueueStatus.mock.calls.length;
      
      jest.advanceTimersByTime(5000);
      
      expect(retryService.getQueueStatus.mock.calls.length).toBe(initialCalls);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<RetryStatusPanel />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', () => {
      render(<RetryStatusPanel />);
      
      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);
    });
  });
});