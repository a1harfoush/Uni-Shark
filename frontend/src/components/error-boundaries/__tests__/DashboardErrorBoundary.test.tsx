import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DashboardErrorBoundary } from '../DashboardErrorBoundary';

// Mock the DataRecoveryEngine
jest.mock('@/lib/data-recovery-engine', () => ({
  DataRecoveryEngine: jest.fn().mockImplementation(() => ({
    recoverFromBackup: jest.fn().mockResolvedValue(true),
    restoreFromBackup: jest.fn().mockResolvedValue(true),
    clearCorruptedLocalData: jest.fn().mockResolvedValue(undefined),
    resetToDefaults: jest.fn().mockResolvedValue(undefined),
    refreshFromServer: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock the Logger
jest.mock('@/lib/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }))
}));

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean; errorMessage?: string }> = ({ 
  shouldThrow, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

describe('DashboardErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={false} />
      </DashboardErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error fallback when child component throws', () => {
    render(
      <DashboardErrorBoundary section="Test Section">
        <ThrowError shouldThrow={true} errorMessage="Component crashed" />
      </DashboardErrorBoundary>
    );

    expect(screen.getByText('System Error Detected')).toBeInTheDocument();
    expect(screen.getByText('Section: TEST SECTION')).toBeInTheDocument();
    expect(screen.getByText(/Component crashed/)).toBeInTheDocument();
  });

  it('shows retry and restore buttons', () => {
    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restore backup/i })).toBeInTheDocument();
  });

  it('handles retry button click', async () => {
    const { rerender } = render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    // After retry, the error boundary should reset
    rerender(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={false} />
      </DashboardErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  it('handles restore button click', async () => {
    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    );

    const restoreButton = screen.getByRole('button', { name: /restore backup/i });
    fireEvent.click(restoreButton);

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByText(/recovering/i)).toBeInTheDocument();
    });
  });

  it('calls custom error handler when provided', () => {
    const onError = jest.fn();
    
    render(
      <DashboardErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} errorMessage="Custom error" />
      </DashboardErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Custom error' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('attempts automatic recovery when enabled', async () => {
    render(
      <DashboardErrorBoundary enableRecovery={true} section="Auto Recovery">
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    );

    // Should show error fallback initially
    expect(screen.getByText('System Error Detected')).toBeInTheDocument();
    
    // Wait for automatic recovery attempt
    await waitFor(() => {
      expect(screen.getByText('Section: AUTO RECOVERY')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('tracks recovery attempts', () => {
    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    );

    // First error should show 0 recovery attempts
    expect(screen.queryByText(/recovery attempts: 0/i)).toBeInTheDocument();
  });

  it('shows technical details when expanded', () => {
    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Detailed error" />
      </DashboardErrorBoundary>
    );

    const detailsToggle = screen.getByText('Technical Details');
    fireEvent.click(detailsToggle);

    expect(screen.getByText('Stack:')).toBeInTheDocument();
    expect(screen.getByText(/Detailed error/)).toBeInTheDocument();
  });

  it('renders custom fallback component when provided', () => {
    const CustomFallback: React.FC<any> = ({ error }) => (
      <div>Custom error: {error?.message}</div>
    );

    render(
      <DashboardErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} errorMessage="Custom fallback test" />
      </DashboardErrorBoundary>
    );

    expect(screen.getByText('Custom error: Custom fallback test')).toBeInTheDocument();
  });

  it('handles network errors appropriately', () => {
    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Network request failed" />
      </DashboardErrorBoundary>
    );

    expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();
    expect(screen.getByText(/Try again in a few moments/)).toBeInTheDocument();
  });

  it('handles storage errors appropriately', () => {
    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Storage quota exceeded" />
      </DashboardErrorBoundary>
    );

    expect(screen.getByText(/Clear browser storage and cache/)).toBeInTheDocument();
    expect(screen.getByText(/Free up disk space/)).toBeInTheDocument();
  });

  it('prevents infinite retry loops', async () => {
    const { rerender } = render(
      <DashboardErrorBoundary enableRecovery={true}>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    );

    // Simulate multiple retry attempts
    for (let i = 0; i < 5; i++) {
      const retryButton = screen.queryByRole('button', { name: /retry/i });
      if (retryButton) {
        fireEvent.click(retryButton);
        rerender(
          <DashboardErrorBoundary enableRecovery={true}>
            <ThrowError shouldThrow={true} />
          </DashboardErrorBoundary>
        );
      }
    }

    // Should still show error boundary, not crash
    expect(screen.getByText('System Error Detected')).toBeInTheDocument();
  });
});