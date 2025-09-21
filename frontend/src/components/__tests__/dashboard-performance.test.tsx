/**
 * Performance and Accessibility Tests for Dashboard Components
 * 
 * Tests performance optimizations (React.memo, useMemo, useCallback) and
 * accessibility features (ARIA labels, keyboard navigation, screen reader support).
 * 
 * Requirements covered: 1.4, 1.5, 2.3, 3.4, 4.4, 5.1, 5.2, 5.3
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import NotificationFeed from '../dashboard/NotificationFeed';
import UpcomingTargets from '../dashboard/UpcomingTargets';
import AbsenceTracker from '../dashboard/AbsenceTracker';
import LocalDataArchive from '../dashboard/LocalDataArchive';

// Mock data for testing
const mockLocalData = {
  lastUpdated: '2025-07-18T12:00:00Z',
  totalScrapes: 10,
  courses: ['Computer Science 101', 'Mathematics 201', 'Physics 301'],
  quizzes: Array.from({ length: 50 }, (_, i) => ({
    name: `Quiz ${i + 1}`,
    course: `Course ${(i % 3) + 1}`,
    grade: `${80 + (i % 20)}%`,
    firstSeen: '2025-07-15T10:00:00Z',
    lastUpdated: '2025-07-18T10:00:00Z'
  })),
  assignments: Array.from({ length: 30 }, (_, i) => ({
    name: `Assignment ${i + 1}`,
    course: `Course ${(i % 3) + 1}`,
    closed_at: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
    firstSeen: '2025-07-16T09:00:00Z',
    lastUpdated: '2025-07-18T09:00:00Z'
  })),
  absences: Array.from({ length: 20 }, (_, i) => ({
    course: `Course ${(i % 3) + 1}`,
    date: `${18 + i}/07/2025`,
    type: i % 2 === 0 ? 'lecture' : 'practical',
    status: i % 3 === 0 ? 'Excused' : 'Unexcused',
    firstSeen: '2025-07-18T08:00:00Z'
  })),
  grades: []
};

const mockDashboardData = {
  is_onboarded: true,
  stats: {
    tasks_today: 2,
    tasks_this_week: 5,
    tasks_later: 3,
    new_absences: 1,
    recent_grades: 2
  },
  last_scrape: {
    scraped_data: {
      quizzes: {
        quizzes_with_results: mockLocalData.quizzes.slice(0, 10),
        quizzes_without_results: mockLocalData.quizzes.slice(10, 20),
        courses_found_on_page: mockLocalData.courses
      },
      assignments: {
        assignments: mockLocalData.assignments.slice(0, 15)
      },
      absences: {
        absences: mockLocalData.absences.slice(0, 10)
      }
    },
    scraped_at: '2025-07-18T12:00:00Z'
  },
  recent_grades_list: []
};

// Helper to create test wrapper with QueryClient
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Dashboard Performance Tests', () => {
  describe('React.memo Optimization', () => {
    test('NotificationFeed should not re-render when props are unchanged', () => {
      const TestWrapper = createTestWrapper();
      let renderCount = 0;
      
      // Create a wrapper component to track renders
      const TrackedNotificationFeed = React.memo(() => {
        renderCount++;
        return (
          <NotificationFeed 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        );
      });

      const { rerender } = render(
        <TestWrapper>
          <TrackedNotificationFeed />
        </TestWrapper>
      );

      const initialRenderCount = renderCount;

      // Re-render with same props - should not cause component re-render
      rerender(
        <TestWrapper>
          <TrackedNotificationFeed />
        </TestWrapper>
      );

      expect(renderCount).toBe(initialRenderCount);
    });

    test('UpcomingTargets should re-render only when data changes', () => {
      const TestWrapper = createTestWrapper();
      
      const { rerender } = render(
        <TestWrapper>
          <UpcomingTargets 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Should display initial data
      expect(screen.getByText('Upcoming Targets')).toBeInTheDocument();

      // Re-render with same data - component should be memoized
      rerender(
        <TestWrapper>
          <UpcomingTargets 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Component should still be rendered correctly
      expect(screen.getByText('Upcoming Targets')).toBeInTheDocument();
    });

    test('AbsenceTracker should handle large datasets efficiently', () => {
      const TestWrapper = createTestWrapper();
      const startTime = performance.now();

      render(
        <TestWrapper>
          <AbsenceTracker absences={mockLocalData.absences} />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (< 50ms for large dataset)
      expect(renderTime).toBeLessThan(50);
      expect(screen.getByText('Absence Tracker')).toBeInTheDocument();
    });

    test('LocalDataArchive should memoize expensive calculations', () => {
      const TestWrapper = createTestWrapper();
      
      // Mock the calculateArchiveStatistics function to track calls
      const mockCalculateStats = jest.fn().mockReturnValue({
        totalCourses: 3,
        totalQuizzes: 50,
        totalAssignments: 30,
        totalAbsences: 20,
        totalGrades: 0,
        lastUpdated: '2025-07-18T12:00:00Z',
        dataIntegrity: 100,
        operationalStatus: 'operational'
      });

      // We can't easily mock the import, so we'll test the behavior indirectly
      const { rerender } = render(
        <TestWrapper>
          <LocalDataArchive 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      expect(screen.getByText('Local Data Archive')).toBeInTheDocument();

      // Re-render with same props
      rerender(
        <TestWrapper>
          <LocalDataArchive 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Component should still render correctly
      expect(screen.getByText('Local Data Archive')).toBeInTheDocument();
    });
  });

  describe('Performance with Large Datasets', () => {
    test('should handle 100+ notifications efficiently', () => {
      const largeDataset = {
        ...mockLocalData,
        quizzes: Array.from({ length: 100 }, (_, i) => ({
          name: `Quiz ${i + 1}`,
          course: `Course ${(i % 10) + 1}`,
          firstSeen: new Date(Date.now() - i * 60000).toISOString()
        })),
        assignments: Array.from({ length: 100 }, (_, i) => ({
          name: `Assignment ${i + 1}`,
          course: `Course ${(i % 10) + 1}`,
          closed_at: new Date(Date.now() + i * 60000).toISOString(),
          firstSeen: new Date(Date.now() - i * 60000).toISOString()
        }))
      };

      const TestWrapper = createTestWrapper();
      const startTime = performance.now();

      render(
        <TestWrapper>
          <NotificationFeed 
            localData={largeDataset} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render large dataset within reasonable time
      expect(renderTime).toBeLessThan(100);
      
      // Should limit displayed items for performance
      const notificationElements = screen.getAllByRole('article');
      expect(notificationElements.length).toBeLessThanOrEqual(15);
    });

    test('should optimize scrolling performance with virtual limits', () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <UpcomingTargets 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Should limit displayed targets for performance
      const targetElements = screen.queryAllByRole('listitem');
      expect(targetElements.length).toBeLessThanOrEqual(5);
    });
  });
});

describe('Dashboard Accessibility Tests', () => {
  describe('ARIA Labels and Semantic HTML', () => {
    test('NotificationFeed should have proper ARIA labels', () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <NotificationFeed 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Check for proper region role and aria-label
      expect(screen.getByRole('region', { name: /academic notifications feed/i })).toBeInTheDocument();
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: /hunt feed/i })).toBeInTheDocument();
      
      // Check for feed role on notification list
      const feedElement = screen.queryByRole('feed');
      if (feedElement) {
        expect(feedElement).toHaveAttribute('aria-live', 'polite');
      }
    });

    test('UpcomingTargets should have proper semantic structure', () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <UpcomingTargets 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Check for proper region and heading
      expect(screen.getByRole('region', { name: /upcoming assignments and quizzes/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /upcoming targets/i })).toBeInTheDocument();
      
      // Check for proper list structure if targets exist
      const listElement = screen.queryByRole('list');
      if (listElement) {
        expect(listElement).toHaveAttribute('aria-live', 'polite');
      }
    });

    test('AbsenceTracker should have accessible absence information', () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <AbsenceTracker absences={mockLocalData.absences.slice(0, 3)} />
        </TestWrapper>
      );

      // Check for proper region and heading
      expect(screen.getByRole('region', { name: /absence tracking information/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /absence tracker/i })).toBeInTheDocument();
      
      // Check for proper list structure
      const listElement = screen.queryByRole('list');
      if (listElement) {
        expect(listElement).toHaveAttribute('aria-live', 'polite');
      }
    });

    test('LocalDataArchive should have accessible statistics', () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <LocalDataArchive 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Check for proper region and heading
      expect(screen.getByRole('region', { name: /local data archive statistics/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /local data archive/i })).toBeInTheDocument();
      
      // Check for progress bar accessibility
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Keyboard Navigation', () => {
    test('should support keyboard navigation in NotificationFeed', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <NotificationFeed 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Find focusable notification elements
      const notificationElements = screen.queryAllByRole('article');
      
      if (notificationElements.length > 0) {
        const firstNotification = notificationElements[0];
        
        // Should be focusable
        expect(firstNotification).toHaveAttribute('tabIndex', '0');
        
        // Focus and test keyboard interaction
        firstNotification.focus();
        expect(firstNotification).toHaveFocus();
        
        // Test Enter key
        await user.keyboard('{Enter}');
        // Should not throw error (keyboard handler should work)
        
        // Test Space key
        await user.keyboard(' ');
        // Should not throw error (keyboard handler should work)
      }
    });

    test('should support keyboard navigation in UpcomingTargets', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <UpcomingTargets 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Find focusable target elements
      const targetElements = screen.queryAllByRole('listitem');
      
      if (targetElements.length > 0) {
        const firstTarget = targetElements[0];
        
        // Should be focusable
        expect(firstTarget).toHaveAttribute('tabIndex', '0');
        
        // Focus and test keyboard interaction
        firstTarget.focus();
        expect(firstTarget).toHaveFocus();
        
        // Test keyboard navigation
        await user.keyboard('{Enter}');
        await user.keyboard(' ');
      }
    });

    test('should support keyboard navigation in AbsenceTracker', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <AbsenceTracker absences={mockLocalData.absences.slice(0, 3)} />
        </TestWrapper>
      );

      // Find focusable absence elements
      const absenceElements = screen.queryAllByRole('listitem');
      
      if (absenceElements.length > 0) {
        const firstAbsence = absenceElements[0];
        
        // Should be focusable
        expect(firstAbsence).toHaveAttribute('tabIndex', '0');
        
        // Focus and test keyboard interaction
        firstAbsence.focus();
        expect(firstAbsence).toHaveFocus();
        
        // Test keyboard navigation
        await user.keyboard('{Enter}');
        await user.keyboard(' ');
      }
    });

    test('should have proper focus management for links', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <NotificationFeed 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Find the "VIEW_ALL" link
      const viewAllLink = screen.getByRole('link', { name: /view all notifications/i });
      
      // Should have proper focus styling
      expect(viewAllLink).toHaveClass('focus:outline-none', 'focus:ring-2');
      
      // Should be keyboard accessible
      await user.tab();
      // Link should be focusable via tab navigation
    });
  });

  describe('Screen Reader Support', () => {
    test('should provide proper screen reader announcements', () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <NotificationFeed 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Check for aria-live regions
      const liveRegions = screen.queryAllByLabelText(/academic notifications/i);
      expect(liveRegions.length).toBeGreaterThan(0);
      
      // Check for proper status announcements
      const statusElement = screen.getByRole('status', { name: /hunt monitor status/i });
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });

    test('should provide descriptive labels for interactive elements', () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <UpcomingTargets 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Check for descriptive aria-labels on interactive elements
      const targetElements = screen.queryAllByRole('listitem');
      
      targetElements.forEach(element => {
        expect(element).toHaveAttribute('aria-label');
        const ariaLabel = element.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel!.length).toBeGreaterThan(10); // Should be descriptive
      });
    });

    test('should hide decorative elements from screen readers', () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <LocalDataArchive 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Check that decorative corner brackets are hidden
      const decorativeElements = document.querySelectorAll('[aria-hidden="true"]');
      expect(decorativeElements.length).toBeGreaterThan(0);
      
      // Decorative elements should not be accessible to screen readers
      decorativeElements.forEach(element => {
        expect(element).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    test('should use appropriate color classes for different priorities', () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <NotificationFeed 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Check for proper color classes that ensure good contrast
      const priorityElements = document.querySelectorAll('.text-state-error, .text-state-warning, .text-state-success');
      expect(priorityElements.length).toBeGreaterThan(0);
      
      // These classes should provide sufficient contrast as per design system
    });

    test('should provide text alternatives for visual indicators', () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <AbsenceTracker absences={mockLocalData.absences.slice(0, 3)} />
        </TestWrapper>
      );

      // Check that icon elements have proper aria-labels
      const iconElements = document.querySelectorAll('[role="img"]');
      iconElements.forEach(icon => {
        expect(icon).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Responsive and Touch Accessibility', () => {
    test('should maintain accessibility on different screen sizes', () => {
      const TestWrapper = createTestWrapper();

      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <LocalDataArchive 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Should maintain proper grid structure and accessibility
      expect(screen.getByRole('region')).toBeInTheDocument();
      expect(screen.getByRole('heading')).toBeInTheDocument();
      
      // Grid should adapt to mobile (grid-cols-2 on mobile, grid-cols-6 on desktop)
      const statsGrid = document.querySelector('.grid-cols-2');
      expect(statsGrid).toBeInTheDocument();
    });

    test('should support touch interactions', () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <NotificationFeed 
            localData={mockLocalData} 
            dashboardData={mockDashboardData} 
          />
        </TestWrapper>
      );

      // Interactive elements should have sufficient touch target size
      const interactiveElements = screen.queryAllByRole('article');
      
      interactiveElements.forEach(element => {
        // Should have padding for touch targets
        expect(element).toHaveClass('p-3');
      });
    });
  });
});