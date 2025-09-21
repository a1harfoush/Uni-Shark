import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorFallback } from '../ErrorFallback';

describe('ErrorFallback', () => {
  const mockProps = {
    error: new Error('Test error message'),
    errorInfo: {
      componentStack: 'Component stack trace'
    } as React.ErrorInfo,
    onRetry: jest.fn(),
    onRestore: jest.fn(),
    isRecovering: false,
    recoveryAttempts: 0,
    section: 'Test Section'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders error information correctly', () => {
    render(<ErrorFallback {...mockProps} />);

    expect(screen.getByText('System Error Detected')).toBeInTheDocument();
    expect(screen.getByText('Section: TEST SECTION')).toBeInTheDocument();
    expect(screen.getByText(/Test error message/)).toBeInTheDocument();
  });

  it('shows recovery attempts when greater than 0', () => {
    render(<ErrorFallback {...mockProps} recoveryAttempts={2} />);

    expect(screen.getByText('Recovery attempts: 2/3')).toBeInTheDocument();
  });

  it('does not show recovery attempts when 0', () => {
    render(<ErrorFallback {...mockProps} recoveryAttempts={0} />);

    expect(screen.queryByText(/Recovery attempts:/)).not.toBeInTheDocument();
  });

  it('renders retry and restore buttons', () => {
    render(<ErrorFallback {...mockProps} />);

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restore backup/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    render(<ErrorFallback {...mockProps} />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    expect(mockProps.onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onRestore when restore button is clicked', () => {
    render(<ErrorFallback {...mockProps} />);

    const restoreButton = screen.getByRole('button', { name: /restore backup/i });
    fireEvent.click(restoreButton);

    expect(mockProps.onRestore).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when recovering', () => {
    render(<ErrorFallback {...mockProps} isRecovering={true} />);

    expect(screen.getByText('Recovering...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recovering/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /restore backup/i })).toBeDisabled();
  });

  it('shows network error recommendations for network errors', () => {
    const networkError = new Error('Network request failed');
    render(<ErrorFallback {...mockProps} error={networkError} />);

    expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();
    expect(screen.getByText(/Try again in a few moments/)).toBeInTheDocument();
  });

  it('shows storage error recommendations for storage errors', () => {
    const storageError = new Error('Storage quota exceeded');
    render(<ErrorFallback {...mockProps} error={storageError} />);

    expect(screen.getByText(/Clear browser storage and cache/)).toBeInTheDocument();
    expect(screen.getByText(/Free up disk space/)).toBeInTheDocument();
  });

  it('shows data error recommendations for data errors', () => {
    const dataError = new Error('Data parsing failed');
    render(<ErrorFallback {...mockProps} error={dataError} />);

    expect(screen.getByText(/Restore from backup data/)).toBeInTheDocument();
    expect(screen.getByText(/Reset to default settings/)).toBeInTheDocument();
  });

  it('shows default recommendations for unknown errors', () => {
    const unknownError = new Error('Unknown error occurred');
    render(<ErrorFallback {...mockProps} error={unknownError} />);

    expect(screen.getByText(/Try refreshing the page/)).toBeInTheDocument();
    expect(screen.getByText(/Contact support if the issue persists/)).toBeInTheDocument();
  });

  it('handles null error gracefully', () => {
    render(<ErrorFallback {...mockProps} error={null} />);

    expect(screen.getByText('System Error Detected')).toBeInTheDocument();
    expect(screen.getByText(/Unknown error occurred/)).toBeInTheDocument();
  });

  it('shows appropriate severity styling for different error types', () => {
    // Test high severity (storage error)
    const { rerender, container } = render(
      <ErrorFallback {...mockProps} error={new Error('Storage quota exceeded')} />
    );
    
    let errorContainer = container.querySelector('.text-red-400');
    expect(errorContainer).toBeInTheDocument();

    // Test medium severity (network error)
    rerender(<ErrorFallback {...mockProps} error={new Error('Network failed')} />);
    
    errorContainer = container.querySelector('.text-orange-400');
    expect(errorContainer).toBeInTheDocument();

    // Test low severity (generic error)
    rerender(<ErrorFallback {...mockProps} error={new Error('Generic error')} />);
    
    errorContainer = container.querySelector('.text-yellow-400');
    expect(errorContainer).toBeInTheDocument();
  });

  it('shows technical details when expanded', () => {
    render(<ErrorFallback {...mockProps} />);

    // Initially technical details should not be visible
    expect(screen.queryByText('Stack:')).not.toBeInTheDocument();

    // Click to expand technical details
    const detailsToggle = screen.getByText('Technical Details');
    fireEvent.click(detailsToggle);

    // Now technical details should be visible
    expect(screen.getByText('Stack:')).toBeInTheDocument();
    expect(screen.getByText('Component Stack:')).toBeInTheDocument();
  });

  it('handles missing error info gracefully', () => {
    render(<ErrorFallback {...mockProps} errorInfo={null} />);

    expect(screen.getByText('System Error Detected')).toBeInTheDocument();
    
    // Expand technical details
    const detailsToggle = screen.getByText('Technical Details');
    fireEvent.click(detailsToggle);

    expect(screen.getByText('Stack:')).toBeInTheDocument();
    expect(screen.queryByText('Component Stack:')).not.toBeInTheDocument();
  });

  it('uses default section name when not provided', () => {
    render(<ErrorFallback {...mockProps} section={undefined} />);

    expect(screen.getByText('Section: UNKNOWN')).toBeInTheDocument();
  });

  it('displays error stack trace in technical details', () => {
    const errorWithStack = new Error('Error with stack');
    errorWithStack.stack = 'Error: Error with stack\n    at Component\n    at App';
    
    render(<ErrorFallback {...mockProps} error={errorWithStack} />);

    // Expand technical details
    const detailsToggle = screen.getByText('Technical Details');
    fireEvent.click(detailsToggle);

    expect(screen.getByText(/Error with stack/)).toBeInTheDocument();
    expect(screen.getByText(/at Component/)).toBeInTheDocument();
  });
});