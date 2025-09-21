/**
 * Tests for Retry Progress Indicator Component
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RetryProgressIndicator, LegacyRetryProgressIndicator, OperationStatusBadge } from '../RetryProgressIndicator';
import { RetryOperation } from '@/lib/retry-service';

// Mock UI components
jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div className={className} data-testid="progress" data-value={value}>
      Progress: {value}%
    </div>
  )
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  )
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      data-variant={variant} 
      data-size={size}
      data-testid="button"
    >
      {children}
    </button>
  )
}));

// Mock hooks
jest.mock('@/lib/hooks/useReliabilityMetrics', () => ({
  useReliabilityMetrics: jest.fn(() => ({
    metrics: {
      retryQueue: []
    }
  }))
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Mock timers
jest.useFakeTimers();

describe('RetryProgressIndicator', () => {
  const mockOperation: RetryOperation = {
    id: 'test-operation-1',
    type: 'data_fetch',
    operation: jest.fn(),
    timestamp: '2023-01-01T10:00:00Z',
    error: 'Network timeout error',
    retryCount: 2,
    maxRetries: 5,
    nextRetryAt: new Date(Date.now() + 30000).toISOString(), // 30 seconds from now
    priority: 'high',
    metadata: {
      url: 'https://api.example.com/data',
      timeout: 5000
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render operation details', () => {
      render(<RetryProgressIndicator operation={mockOperation} />);
      
      expect(screen.getByText('test-operation-1')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('Data Fetch')).toBeInTheDocument();
    });

    it('should display retry progress', () => {
      render(<RetryProgressIndicator operation={mockOperation} />);
      
      expect(screen.getByText('Attempt 2 of 5')).toBeInTheDocument();
      
      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-value', '40'); // 2/5 * 100
    });

    it('should show countdown timer', () => {
      render(<RetryProgressIndicator operation={mockOperation} />);
      
      expect(screen.getByText(/Retry in \d+s/)).toBeInTheDocument();
    });

    it('should display error message', () => {
      render(<RetryProgressIndicator operation={mockOperation} />);
      
      expect(screen.getByText('Network timeout error')).toBeInTheDocument();
    });

    it('should display metadata when present', () => {
      render(<RetryProgressIndicator operation={mockOperation} />);
      
      expect(screen.getByText('url:')).toBeInTheDocument();
      expect(screen.getByText('https://api.example.com/data')).toBeInTheDocument();
      expect(screen.getByText('timeout:')).toBeInTheDocument();
      expect(screen.getByText('5000')).toBeInTheDocument();
    });
  });

  describe('Status Icons and Text', () => {
    it('should show clock icon when waiting for retry', () => {
      render(<RetryProgressIndicator operation={mockOperation} />);
      
      // Clock icon should be present (tested via class or data attribute)
      expect(screen.getByText(/Retry in/)).toBeInTheDocument();
    });

    it('should show spinning icon when retrying', () => {
      const activeOperation = {
        ...mockOperation,
        nextRetryAt: new Date(Date.now() - 1000).toISOString() // Past time
      };

      render(<RetryProgressIndicator operation={activeOperation} />);
      
      expect(screen.getByText('Ready to retry')).toBeInTheDocument();
    });

    it('should show error icon when max retries reached', () => {
      const failedOperation = {
        ...mockOperation,
        retryCount: 5,
        maxRetries: 5
      };

      render(<RetryProgressIndicator operation={failedOperation} />);
      
      expect(screen.getByText('Max retries reached')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  describe('Priority Styling', () => {
    it('should apply critical priority styling', () => {
      const criticalOperation = { ...mockOperation, priority: 'critical' as const };
      render(<RetryProgressIndicator operation={criticalOperation} />);
      
      const badge = screen.getByText('critical');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800', 'border-red-200');
    });

    it('should apply high priority styling', () => {
      const highOperation = { ...mockOperation, priority: 'high' as const };
      render(<RetryProgressIndicator operation={highOperation} />);
      
      const badge = screen.getByText('high');
      expect(badge).toHaveClass('bg-orange-100', 'text-orange-800', 'border-orange-200');
    });

    it('should apply medium priority styling', () => {
      const mediumOperation = { ...mockOperation, priority: 'medium' as const };
      render(<RetryProgressIndicator operation={mediumOperation} />);
      
      const badge = screen.getByText('medium');
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800', 'border-blue-200');
    });

    it('should apply low priority styling', () => {
      const lowOperation = { ...mockOperation, priority: 'low' as const };
      render(<RetryProgressIndicator operation={lowOperation} />);
      
      const badge = screen.getByText('low');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800', 'border-gray-200');
    });
  });

  describe('Countdown Timer', () => {
    it('should update countdown every second', () => {
      const futureTime = new Date(Date.now() + 65000).toISOString(); // 65 seconds
      const operationWithFutureRetry = {
        ...mockOperation,
        nextRetryAt: futureTime
      };

      render(<RetryProgressIndicator operation={operationWithFutureRetry} />);
      
      expect(screen.getByText('Retry in 1m 5s')).toBeInTheDocument();
      
      act(() => {
        jest.advanceTimersByTime(5000); // Advance 5 seconds
      });
      
      expect(screen.getByText('Retry in 1m 0s')).toBeInTheDocument();
    });

    it('should show seconds only for short delays', () => {
      const shortDelayTime = new Date(Date.now() + 30000).toISOString(); // 30 seconds
      const operationWithShortDelay = {
        ...mockOperation,
        nextRetryAt: shortDelayTime
      };

      render(<RetryProgressIndicator operation={operationWithShortDelay} />);
      
      expect(screen.getByText('Retry in 30s')).toBeInTheDocument();
    });

    it('should handle countdown reaching zero', () => {
      const pastTime = new Date(Date.now() - 1000).toISOString();
      const operationWithPastRetry = {
        ...mockOperation,
        nextRetryAt: pastTime
      };

      render(<RetryProgressIndicator operation={operationWithPastRetry} />);
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(screen.getByText('Ready to retry')).toBeInTheDocument();
    });
  });

  describe('Control Buttons', () => {
    it('should render force retry button when callback provided', () => {
      const onForceRetry = jest.fn();
      
      render(
        <RetryProgressIndicator 
          operation={mockOperation} 
          onForceRetry={onForceRetry}
        />
      );
      
      const forceRetryButton = screen.getByTestId('button');
      expect(forceRetryButton).toBeInTheDocument();
      
      fireEvent.click(forceRetryButton);
      expect(onForceRetry).toHaveBeenCalledWith('test-operation-1');
    });

    it('should render cancel button when callback provided', () => {
      const onCancel = jest.fn();
      
      render(
        <RetryProgressIndicator 
          operation={mockOperation} 
          onCancel={onCancel}
        />
      );
      
      const cancelButton = screen.getByTestId('button');
      fireEvent.click(cancelButton);
      
      expect(onCancel).toHaveBeenCalledWith('test-operation-1');
    });

    it('should disable force retry when max retries reached', () => {
      const maxRetriesOperation = {
        ...mockOperation,
        retryCount: 5,
        maxRetries: 5
      };
      
      const onForceRetry = jest.fn();
      
      render(
        <RetryProgressIndicator 
          operation={maxRetriesOperation} 
          onForceRetry={onForceRetry}
        />
      );
      
      const forceRetryButton = screen.getByTestId('button');
      expect(forceRetryButton).toBeDisabled();
    });
  });

  describe('Details Toggle', () => {
    it('should hide details when showDetails is false', () => {
      render(
        <RetryProgressIndicator 
          operation={mockOperation} 
          showDetails={false}
        />
      );
      
      expect(screen.queryByText('Type:')).not.toBeInTheDocument();
      expect(screen.queryByText('Started:')).not.toBeInTheDocument();
    });

    it('should show details by default', () => {
      render(<RetryProgressIndicator operation={mockOperation} />);
      
      expect(screen.getByText('Type:')).toBeInTheDocument();
      expect(screen.getByText('Started:')).toBeInTheDocument();
    });
  });

  describe('Operation Type Formatting', () => {
    it('should format operation types correctly', () => {
      const operations = [
        { ...mockOperation, type: 'data_fetch' as const },
        { ...mockOperation, type: 'course_expansion' as const },
        { ...mockOperation, type: 'data_processing' as const },
        { ...mockOperation, type: 'scrape_operation' as const }
      ];

      operations.forEach((op, index) => {
        const { unmount } = render(<RetryProgressIndicator operation={op} />);
        
        const expectedTexts = ['Data Fetch', 'Course Expansion', 'Data Processing', 'Scrape Operation'];
        expect(screen.getByText(expectedTexts[index])).toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format timestamps correctly', () => {
      const testDate = new Date('2023-01-01T15:30:45Z');
      const operationWithTestDate = {
        ...mockOperation,
        timestamp: testDate.toISOString()
      };

      render(<RetryProgressIndicator operation={operationWithTestDate} />);
      
      // Should show localized time
      expect(screen.getByText(/\d{1,2}:\d{2}:\d{2}/)).toBeInTheDocument();
    });
  });
});

describe('LegacyRetryProgressIndicator', () => {
  const { useReliabilityMetrics } = require('@/lib/hooks/useReliabilityMetrics');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render nothing when no retry queue', () => {
    useReliabilityMetrics.mockReturnValue({
      metrics: { retryQueue: [] }
    });

    const { container } = render(<LegacyRetryProgressIndicator localData={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render retry indicators', () => {
    useReliabilityMetrics.mockReturnValue({
      metrics: {
        retryQueue: [
          { status: 'in_progress' },
          { status: 'pending' },
          { status: 'completed' }
        ]
      }
    });

    render(<LegacyRetryProgressIndicator localData={{}} />);
    
    expect(screen.getByText('RETRYING:')).toBeInTheDocument();
    expect(screen.getByText('1 active')).toBeInTheDocument();
    expect(screen.getByText('1 pending')).toBeInTheDocument();
  });

  it('should limit displayed dots to 5', () => {
    useReliabilityMetrics.mockReturnValue({
      metrics: {
        retryQueue: Array(8).fill({ status: 'pending' })
      }
    });

    render(<LegacyRetryProgressIndicator localData={{}} />);
    
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('should hide label when showLabel is false', () => {
    useReliabilityMetrics.mockReturnValue({
      metrics: {
        retryQueue: [{ status: 'pending' }]
      }
    });

    render(<LegacyRetryProgressIndicator localData={{}} showLabel={false} />);
    
    expect(screen.queryByText('RETRYING:')).not.toBeInTheDocument();
  });
});

describe('OperationStatusBadge', () => {
  const mockOperation = {
    type: 'data_fetch',
    status: 'in_progress' as const,
    retryCount: 2,
    maxRetries: 5
  };

  it('should render operation status correctly', () => {
    render(<OperationStatusBadge operation={mockOperation} />);
    
    expect(screen.getByText('⏳')).toBeInTheDocument();
    expect(screen.getByText('DATA FETCH')).toBeInTheDocument();
    expect(screen.getByText('(2/5)')).toBeInTheDocument();
  });

  it('should handle different status types', () => {
    const statuses = [
      { status: 'pending' as const, icon: '⏸️' },
      { status: 'in_progress' as const, icon: '⏳' },
      { status: 'completed' as const, icon: '✅' },
      { status: 'failed' as const, icon: '❌' }
    ];

    statuses.forEach(({ status, icon }) => {
      const { unmount } = render(
        <OperationStatusBadge operation={{ ...mockOperation, status }} />
      );
      
      expect(screen.getByText(icon)).toBeInTheDocument();
      unmount();
    });
  });

  it('should format operation type correctly', () => {
    const operationWithUnderscore = {
      ...mockOperation,
      type: 'course_expansion'
    };

    render(<OperationStatusBadge operation={operationWithUnderscore} />);
    
    expect(screen.getByText('COURSE EXPANSION')).toBeInTheDocument();
  });

  it('should handle missing retry counts', () => {
    const operationWithoutRetries = {
      type: 'data_fetch',
      status: 'pending' as const
    };

    render(<OperationStatusBadge operation={operationWithoutRetries} />);
    
    expect(screen.getByText('DATA FETCH')).toBeInTheDocument();
    expect(screen.queryByText(/\(\d+\/\d+\)/)).not.toBeInTheDocument();
  });
});