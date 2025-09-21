import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  SectionErrorBoundary,
  KPIErrorBoundary,
  NotificationErrorBoundary,
  TargetsErrorBoundary,
  AbsenceErrorBoundary,
  ArchiveErrorBoundary,
  ScanErrorBoundary
} from '../SectionErrorBoundary';

// Mock the dependencies
jest.mock('@/lib/data-recovery-engine', () => ({
  DataRecoveryEngine: jest.fn().mockImplementation(() => ({
    recoverFromBackup: jest.fn().mockResolvedValue(true),
    restoreFromBackup: jest.fn().mockResolvedValue(true)
  }))
}));

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
  return <div>Working component</div>;
};

describe('SectionErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <SectionErrorBoundary section="Test Section">
        <ThrowError shouldThrow={false} />
      </SectionErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('renders section-specific error fallback when child throws', () => {
    render(
      <SectionErrorBoundary section="Test Section">
        <ThrowError shouldThrow={true} errorMessage="Section failed" />
      </SectionErrorBoundary>
    );

    expect(screen.getByText('Test Section Section Error')).toBeInTheDocument();
    expect(screen.getByText('Section failed')).toBeInTheDocument();
  });

  it('shows retry and restore buttons in section fallback', () => {
    render(
      <SectionErrorBoundary section="Test Section">
        <ThrowError shouldThrow={true} />
      </SectionErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restore/i })).toBeInTheDocument();
  });

  it('applies custom fallback height', () => {
    const { container } = render(
      <SectionErrorBoundary section="Test Section" fallbackHeight="300px">
        <ThrowError shouldThrow={false} />
      </SectionErrorBoundary>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.minHeight).toBe('300px');
  });

  it('handles retry button click in section fallback', () => {
    const { rerender } = render(
      <SectionErrorBoundary section="Test Section">
        <ThrowError shouldThrow={true} />
      </SectionErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    // Rerender with no error
    rerender(
      <SectionErrorBoundary section="Test Section">
        <ThrowError shouldThrow={false} />
      </SectionErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('can disable recovery', () => {
    render(
      <SectionErrorBoundary section="Test Section" enableRecovery={false}>
        <ThrowError shouldThrow={true} />
      </SectionErrorBoundary>
    );

    // Should still show error fallback
    expect(screen.getByText('Test Section Section Error')).toBeInTheDocument();
  });

  it('calls custom error handler when provided', () => {
    const onError = jest.fn();
    
    render(
      <SectionErrorBoundary section="Test Section" onError={onError}>
        <ThrowError shouldThrow={true} errorMessage="Custom section error" />
      </SectionErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Custom section error' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });
});

describe('Specific Section Error Boundaries', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('KPIErrorBoundary renders with correct section name', () => {
    render(
      <KPIErrorBoundary>
        <ThrowError shouldThrow={true} />
      </KPIErrorBoundary>
    );

    expect(screen.getByText('KPI Cards Section Error')).toBeInTheDocument();
  });

  it('NotificationErrorBoundary renders with correct section name', () => {
    render(
      <NotificationErrorBoundary>
        <ThrowError shouldThrow={true} />
      </NotificationErrorBoundary>
    );

    expect(screen.getByText('Notifications Section Error')).toBeInTheDocument();
  });

  it('TargetsErrorBoundary renders with correct section name', () => {
    render(
      <TargetsErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TargetsErrorBoundary>
    );

    expect(screen.getByText('Upcoming Targets Section Error')).toBeInTheDocument();
  });

  it('AbsenceErrorBoundary renders with correct section name', () => {
    render(
      <AbsenceErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AbsenceErrorBoundary>
    );

    expect(screen.getByText('Absence Tracker Section Error')).toBeInTheDocument();
  });

  it('ArchiveErrorBoundary renders with correct section name', () => {
    render(
      <ArchiveErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ArchiveErrorBoundary>
    );

    expect(screen.getByText('Data Archive Section Error')).toBeInTheDocument();
  });

  it('ScanErrorBoundary renders with correct section name', () => {
    render(
      <ScanErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ScanErrorBoundary>
    );

    expect(screen.getByText('Scan Operations Section Error')).toBeInTheDocument();
  });

  it('all specific boundaries render children when no error', () => {
    const boundaries = [
      KPIErrorBoundary,
      NotificationErrorBoundary,
      TargetsErrorBoundary,
      AbsenceErrorBoundary,
      ArchiveErrorBoundary,
      ScanErrorBoundary
    ];

    boundaries.forEach((Boundary, index) => {
      const { unmount } = render(
        <Boundary>
          <div>Test content {index}</div>
        </Boundary>
      );

      expect(screen.getByText(`Test content ${index}`)).toBeInTheDocument();
      unmount();
    });
  });

  it('specific boundaries have appropriate fallback heights', () => {
    const testCases = [
      { Boundary: KPIErrorBoundary, expectedHeight: '120px' },
      { Boundary: NotificationErrorBoundary, expectedHeight: '200px' },
      { Boundary: TargetsErrorBoundary, expectedHeight: '200px' },
      { Boundary: AbsenceErrorBoundary, expectedHeight: '200px' },
      { Boundary: ArchiveErrorBoundary, expectedHeight: '150px' },
      { Boundary: ScanErrorBoundary, expectedHeight: '100px' }
    ];

    testCases.forEach(({ Boundary, expectedHeight }) => {
      const { container, unmount } = render(
        <Boundary>
          <div>Test content</div>
        </Boundary>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.minHeight).toBe(expectedHeight);
      unmount();
    });
  });
});